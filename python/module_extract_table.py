from multiprocessing import Pool, cpu_count
import json
import os
from PIL import Image
import tempfile
import cv2
import numpy as np
from pytesseract import Output, pytesseract
from img2table.document import Image as TableImage
import psycopg2
import re


def extract_table(imagePath):
    if not os.path.exists(imagePath):
        return {"error": "Path not exit"}
    image_rgb = Image.open(imagePath).convert("RGB")
    table_boundings = get_table_bounding_box(imagePath)
    prediction_list = []
    if(len(table_boundings) != 0):
        for i, table_bounding in enumerate(table_boundings):
            cropped_image = image_rgb.crop([table_bounding['bounding_box']['left']-10,table_bounding['bounding_box']['top']-10,table_bounding['bounding_box']['right']+10,table_bounding['bounding_box']['bottom']+10])
            temp_file_name = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            cropped_image.save(temp_file_name.name)
            table_data = get_tables_data(temp_file_name.name)
            
            prediction_list.append({"label":str('table'),"table":table_data,"table_identifier":table_bounding['table_identifier'],'text': table_bounding['word'],"box":[table_bounding['bounding_box']['left']-10,table_bounding['bounding_box']['top']-10,table_bounding['bounding_box']['right']+10,table_bounding['bounding_box']['bottom']+10]})
            cropped_image.close()
            
    # if prediction_list and len(prediction_list) > 0 and 'table' in prediction_list[0]:
    #     cleaned_data = [[{'text': elem['text']} for elem in row] for row in prediction_list[0]['table']]
    # else:
    #     cleaned_data = []
    # print(cleaned_data,flush=True)
    # return jsonify({"message": "Successfully extracted the table from the image","table":cleaned_data,"page":image.filename})
    filename = os.path.basename(imagePath)

    return {"table":prediction_list,"page":filename}

def get_table_bounding_box(image):
    image_table = TableImage(image, detect_rotation=False)
    main_image = Image.open(image).convert("RGB")
    tables = image_table.extract_tables()
    ocr_data = []
    for table in tables:
        bounding_boxes = {
        "left": table.bbox.x1,
        "top": table.bbox.y1, 
        "right": table.bbox.x2,
        "bottom": table.bbox.y2
        }
        table_identifier = {}
        cropped_image = main_image.crop([bounding_boxes['left'],bounding_boxes['top'],bounding_boxes['right'],bounding_boxes['bottom']])
        cropped_image2 = main_image.crop([0,0,main_image.width,bounding_boxes['top']])
        image_array = np.array(cropped_image2)
        gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
        extracted_text_above_table = pytesseract.image_to_string(gray, config='--oem 3 --psm 6')
        # print(extracted_text_above_table)
        lines = extracted_text_above_table.splitlines()
        
        for i,text in enumerate(reversed(lines)):
          if re.match(r'^\d+\..*\.?$', text):
            sliced_list = lines[::-1][:i+1]
            merged_line = ''.join(sliced_list[::-1])
            pattern = re.compile(r'^(\d+(\.\d+)*\.)\s*(.*)$')
            # Match the pattern in the merged line
            match_text = pattern.match(merged_line)
            if match_text:
              key = match_text.group(1)
              value = match_text.group(3)
              table_identifier = {'key': key, 'value': value}
            # print(result_dict)
            break
        # print(lines)
        image_array = np.array(cropped_image)
        gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
        extracted_text = pytesseract.image_to_string(gray,config='— oem 3 — psm 10',lang='eng')
        # ocr_data.append({"word": extracted_text, "bounding_box": bounding_boxes,"table":True})
        ocr_data.append({"word": extracted_text, "bounding_box": bounding_boxes,"table":True,"table_identifier":table_identifier})

    return ocr_data
    
    
def get_tables_data(path):
  read_image= cv2.imread(path,0)
  image_height, image_width = read_image.shape

  convert_bin, grey_scale = cv2.threshold(read_image, 128, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
  grey_scale = 255 - grey_scale
  # grey_graph = plt.imshow(grey_scale, cmap='gray')
  # plt.show()

  # Calculate the length for the horizontal kernel, which is 1% of the image width
  length = np.array(read_image).shape[1] // 100

  # Create a horizontal kernel using the calculated length and a width of 1 pixel
  horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (length, 1))

  horizontal_detect = cv2.erode(grey_scale, horizontal_kernel, iterations=3)
  hor_line = cv2.dilate(horizontal_detect, horizontal_kernel, iterations=3)
  # plotting = plt.imshow(horizontal_detect, cmap='gray')
  # plt.show()

  vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, length))
  vertical_detect = cv2.erode(grey_scale, vertical_kernel, iterations=3)
  ver_lines = cv2.dilate(vertical_detect, vertical_kernel, iterations=3)
  # show = plt.imshow(vertical_detect, cmap='gray')
  # plt.show()

  # Create a 2x2 rectangular structuring element
  final = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))

  # Combine the 'ver_lines' and 'hor_line' images with equal weights
  combine = cv2.addWeighted(ver_lines, 0.5, hor_line, 0.5, 0.0)

  # Erode the complement of 'combine' image using the 'final' structuring element for 2 iterations
  combine = cv2.erode(~combine, final, iterations=2)

  # Apply Otsu's thresholding to 'combine' to get a binary image
  thresh, combine = cv2.threshold(combine, 128, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

  # Assuming you have 'combine' defined elsewhere
  cont, _ = cv2.findContours(combine, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

  def get_boxes(num, method="left-to-right"):
      invert = False
      flag = 0
      
      # Check the specified method and update flags accordingly
      if method == "right-to-left" or method == "bottom-to-top":
          invert = True
      if method == "top-to-bottom" or method == "bottom-to-top":
          flag = 1
      
      # Calculate bounding rectangles for each contour in 'num'
      boxes = [cv2.boundingRect(c) for c in num]
      
      # Sort contours and bounding boxes based on the specified method
      (num, boxes) = zip(*sorted(zip(num, boxes), key=lambda b: b[1][0], reverse=invert))
      
      return (num, boxes)

  # Call the 'get_boxes' function with the 'cont' contours and the specified method
  cont, boxes = get_boxes(cont, method="top-to-bottom")

  final_box = []

  count = 0
  for c in cont:
      s1, s2, s3, s4 = cv2.boundingRect(c)
      count += 1
      if (s3 < image_width-30 and s4 < image_height-30):
          # rectangle_img = cv2.rectangle(read_image, (s1, s2), (s1 + s3, s2 + s4), (0, 0, 255), 2)  # Changed color to red
          image = Image.open(path).convert("RGB")
          cropped_image = image.crop([s1, s2, s1 + s3, s2 + s4])
          image_array = np.array(cropped_image)
          gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
          extracted_text = pytesseract.image_to_string(gray,config='— oem 3 — psm 10')
          if not extracted_text.strip():
              extracted_text = pytesseract.image_to_string(gray,config='--psm 10')

          final_box.append({"box":[s1, s2, s1 + s3, s2 + s4],"text":extracted_text})
  # graph = plt.imshow(rectangle_img)
  # print(final_box)
  table_data = []
  boxes = []
  for box in final_box:
    row = []
    if box['box'][1] not in boxes:
      for ite in final_box:
        if (box['box'][1]==ite['box'][1]):
          row.append(ite)
      boxes.append(box['box'][1])
      table_data.append(row)
#   print(table_data,flush=True)
  return table_data[::-1]



class extractTable:
    def __init__(self,parsed_data,websocket):
        # Instance attribute
        self.parsed_data = parsed_data
        self.websocket = websocket
        # self.pool = Pool()
        
    
    
    async def  extract_table_multiprocessor(self):
        num_processes = max(1, round(cpu_count()/2))
        with Pool(processes=num_processes) as pool:
                results = []
                total_tasks = len(self.parsed_data['tables'])
                completed_tasks = 0

                for result in pool.imap(extract_table, self.parsed_data['tables']):
                    results.append(result)
                    completed_tasks += 1
                    progress_percentage = (completed_tasks / total_tasks) * 100
                    await self.websocket.send(json.dumps({'type':'progress','message':f"Progress: {progress_percentage:.2f}% ({completed_tasks} / {total_tasks} jobs completed)",'progress':f"{progress_percentage:.2f}",'task':{'total':total_tasks,'completed':completed_tasks}}))
                    await self.websocket.send(json.dumps({'type':'table_progress','data':result}))
                    print(f"Progress: {progress_percentage:.2f}% ({completed_tasks} / {total_tasks} jobs completed)" , flush=True)
                
                # Terminate the pool after all tasks are completed
                pool.close()
                pool.join()
        # Now, 'results' contains the processed data for each image
        tables = results
        
        response = self.saveToDb(tables)
        return response;
    
    
    def saveToDb(self,data_to_insert):
        # db_params = {
        #     'dbname': os.environ.get('POSTGRES_DB'),
        #     'user': os.environ.get('POSTGRES_USER'),
        #     'password': os.environ.get('POSTGRES_PASSWORD'),
        #     'host': os.environ.get('POSTGRES_HOST'),  # Typically 'localhost' if the database is on the same machine
        #     'port': os.environ.get('POSTGRES_PORT'),  # Default PostgreSQL port
        # }
        
        # # Connect to the database
        # conn = psycopg2.connect(**db_params)
        # insert_query = 'INSERT INTO "Table" (id,data, "createdAt", "updatedAt") VALUES (%s,%s, %s, %s);'
        
        # # Convert the JSON object to a JSON string
        # from datetime import datetime
        # created_at = updated_at = datetime.now()
        # # print(json.dumps(data_to_insert['table']), flush=True)
        # try:
        #     cursor = conn.cursor()
        #     query_with_values = cursor.mogrify(insert_query, (self.parsed_data['uuid'],json.dumps(data_to_insert),created_at,updated_at))
        #     # print("Raw SQL Query:", query_with_values.decode('utf-8'))
        #     cursor.execute(query_with_values)
        #     # inserted_id = cursor.fetchone()[0]
        #     conn.commit()
        # except psycopg2.Error as e:
        # # Handle the exception
        #     if 'cursor' in locals():
        #         cursor.close()
        #     conn.close()
        #     return {'error':str(e)}
        #     # print(e,flush=True)
            
        # finally:
        # # Close the cursor and database connection
        #     if 'cursor' in locals():
        #         cursor.close()
        # conn.close()
        
        return {'type':'response','response':{'id':self.parsed_data['uuid'],"data":data_to_insert}}
    
    # @app.route('/extract-table', methods=['POST'])

    
    

    
    
    

