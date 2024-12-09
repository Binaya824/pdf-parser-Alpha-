from multiprocessing import Pool, cpu_count, Manager , Value , Lock
from functools import partial
import json
import os
from PIL import Image
import tempfile
import cv2
import numpy as np
from pytesseract import pytesseract
import re
# import redis


# redis_conn = redis.StrictRedis(host='redis', port=6379, decode_responses=True)
async def extract_table_multiprocessor(parsed_data, websocket):
    """
    Process table extraction using multiprocessing.
    """
    page_last_identifier = {}
    data = []
    num_processes = max(1, round(cpu_count() / 2))
    # Initialize Redis shared identifier
    # redis_conn.hset("shared_identifier", mapping={"key": "binaya_key redis", "value": "binaya_value redis"})
    with Pool(processes=num_processes) as pool:
        total_tasks = len(parsed_data["tables"])
        completed_tasks = 0

        # Use partial to pass shared_identifier and lock to workers
        # extract_table_with_redis = partial(
        #      extract_table_worker
        # )

        results = []
        for result in pool.imap(extract_table_worker, parsed_data["tables"]):

            if(result["table"]):
                for t in result["table"]:
                    if(not t["table_identifier"]):
                        t["table_identifier"] = page_last_identifier
                # result["table"]["table_identifier"] = page_last_identifier

            results.append({
                "table": result["table"],
                "page": result["page"],
            })

            if(result["last_identifier"]):
                page_last_identifier = result["last_identifier"]
            data = results
            completed_tasks += 1

            progress_percentage = (completed_tasks / total_tasks) * 100
            await websocket.send(json.dumps({
                "type": "progress",
                "message": f"Progress: {progress_percentage:.2f}% ({completed_tasks}/{total_tasks} jobs completed)",
                "progress": f"{progress_percentage:.2f}"
            }))

    # pool.close()
    # pool.join()

      # Print final shared identifier
    # shared_identifier = redis_conn.hgetall("shared_identifier")
    # print(f"Final shared identifier: {shared_identifier}")        
    response = saveToDb(data, parsed_data["uuid"])
    return response
        
        


def extract_table_worker(imagePath):
    """
    Worker function to extract table data.
    """
    # redis_conn = redis.StrictRedis(host='redis', port=6379, decode_responses=True)
    if not os.path.exists(imagePath):
        return {"error": f"Path does not exist: {imagePath}"}

    # shared_identifier = redis_conn.hgetall("shared_identifier")
    # table_key = shared_identifier.get("key", "")
    # table_value = shared_identifier.get("value", "default")

    # Process the image and extract bounding boxes
    image_rgb = Image.open(imagePath).convert("RGB")
    table_boundings = get_table_bounding_box(imagePath)
    prediction_list = []
    last_identifier = {}

    image_array_above = np.array(image_rgb)
    gray_above = cv2.cvtColor(image_array_above, cv2.COLOR_BGR2GRAY)

    # OCR for text above the table
    extracted_text_above_table = pytesseract.image_to_string(gray_above, config='--oem 3 --psm 6')
    lines = extracted_text_above_table.splitlines()

    for i, text in enumerate(reversed(lines)):
            if re.match(r'^\d+\..*\.?$', text):
                sliced_list = lines[::-1][:i + 1]
                merged_line = ''.join(sliced_list[::-1])
                pattern = re.compile(r'^(\d+(\.\d+)*\.)\s*(.*)$')
                match_text = pattern.match(merged_line)
                if match_text:
                     # Update shared_identifier in Redis
                    last_identifier = {
                        "key": match_text.group(1),
                        "value": match_text.group(3)
                    }

                   
                    # identifier_matched = True
                break

    if len(table_boundings) != 0:
        for table_bounding in table_boundings:
            cropped_image = image_rgb.crop([
                table_bounding['bounding_box']['left'] - 10,
                table_bounding['bounding_box']['top'] - 10,
                table_bounding['bounding_box']['right'] + 10,
                table_bounding['bounding_box']['bottom'] + 10
            ])
            temp_file_name = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            cropped_image.save(temp_file_name.name)

            table_data = get_tables_data(temp_file_name.name)
            table_identifier = table_bounding.get('table_identifier')
            prediction_list.append({
                "label": 'table',
                "table": table_data,
                "table_identifier": table_identifier,
                'text': table_bounding['word'],
                "box": [
                    table_bounding['bounding_box']['left'] - 10,
                    table_bounding['bounding_box']['top'] - 10,
                    table_bounding['bounding_box']['right'] + 10,
                    table_bounding['bounding_box']['bottom'] + 10
                ]
            })
            cropped_image.close()

    filename = os.path.basename(imagePath)
    return {"table": prediction_list, "page": filename , "last_identifier": last_identifier}


def get_table_bounding_box(imagePath):
    """
    Identify tables in the image and assign bounding boxes.
    """
    from img2table.document import Image as TableImage

    image_table = TableImage(imagePath, detect_rotation=False)
    main_image = Image.open(imagePath).convert("RGB")
    tables = image_table.extract_tables()
    ocr_data = []
    table_identifier = {}
    last_table_identifier = {}

    for table in tables:
        bounding_boxes = {
            "left": table.bbox.x1,
            "top": table.bbox.y1,
            "right": table.bbox.x2,
            "bottom": table.bbox.y2
        }

        # Crop image above the table for text extraction
        cropped_image_above = main_image.crop([0, 0, main_image.width, bounding_boxes['top']])
        if cropped_image_above.width == 0 or cropped_image_above.height == 0:
            continue

        image_array_above = np.array(cropped_image_above)
        gray_above = cv2.cvtColor(image_array_above, cv2.COLOR_BGR2GRAY)

        # OCR for text above the table
        extracted_text_above_table = pytesseract.image_to_string(gray_above, config='--oem 3 --psm 6')
        lines = extracted_text_above_table.splitlines()

        # Use regex to find table identifiers
        identifier_matched = False
        

        for i, text in enumerate(reversed(lines)):
            if re.match(r'^\d+\..*\.?$', text):
                sliced_list = lines[::-1][:i + 1]
                merged_line = ''.join(sliced_list[::-1])
                pattern = re.compile(r'^(\d+(\.\d+)*\.)\s*(.*)$')
                match_text = pattern.match(merged_line)
                if match_text:
                     # Update shared_identifier in Redis
                    table_identifier = {
                        "key": match_text.group(1),
                        "value": match_text.group(3)
                    }
                    last_table_identifier = table_identifier
                    # redis_conn.hset("shared_identifier", mapping=table_identifier)

                   
                    identifier_matched = True
                break

        if not identifier_matched:
            print("No identifier found. Using last matched identifier.")
            # table_identifier = redis_conn.hgetall("shared_identifier")

        ocr_data.append({
            "word": extracted_text_above_table,
            "bounding_box": bounding_boxes,
            "table": True,
            "table_identifier": table_identifier  # Use the current identifier
        })

    
    return ocr_data



def get_tables_data(path):
    read_image = cv2.imread(path, 0)
    image_height, image_width = read_image.shape

    _, grey_scale = cv2.threshold(read_image, 128, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    grey_scale = 255 - grey_scale

    length = image_width // 100
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (length, 1))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, length))

    hor_lines = cv2.dilate(cv2.erode(grey_scale, horizontal_kernel, iterations=3), horizontal_kernel, iterations=3)
    ver_lines = cv2.dilate(cv2.erode(grey_scale, vertical_kernel, iterations=3), vertical_kernel, iterations=3)

    combine = cv2.addWeighted(ver_lines, 0.5, hor_lines, 0.5, 0.0)
    combine = cv2.erode(~combine, cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2)), iterations=2)
    _, combine = cv2.threshold(combine, 128, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

    contours, _ = cv2.findContours(combine, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    def get_boxes(num):
        boxes = [cv2.boundingRect(c) for c in num]
        return sorted(boxes, key=lambda b: (b[1], b[0]))  # Sort by Y first, then X.

    boxes = get_boxes(contours)
    final_boxes = []
    column_x_coords = {}
    padding = 10

    for s1, s2, s3, s4 in boxes:
        if s3 < image_width-30 and s4 < image_height-30:  # Filter large boxes
            # image = Image.open(path).convert("RGB")
            # if s1 in column_x_coords:
            #     column_x_coords[s1] = True
            #     cropped_image = image.crop([s1 - padding, s2 - padding, s1 + s3 + padding, s2 + s4 + padding])
            # else:
            #     cropped_image = image.crop([s1, s2, s1 + s3, s2 + s4])

            # image_array = np.array(cropped_image)
            # gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
            image = Image.open(path).convert("RGB")
            cropped_image = image.crop([s1, s2, s1 + s3, s2 + s4])
            image_array = np.array(cropped_image)
            gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)

            # Try multiple OCR configurations
            extracted_text = pytesseract.image_to_string(
                gray, 
                config='--psm 6 --oem 3 -c tessedit_char_whitelist=" .123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ()0,;:\\?!/\\_ -*#ivxlcdmIVXLCDM"'
            )

            if not extracted_text.strip():
                extracted_text = pytesseract.image_to_string(
                    gray, 
                    config='--psm 11 --oem 1 -c tessedit_char_whitelist=" .123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ()0,;:\\?!/\\_ -*#ivxlcdmIVXLCDM"'
                )


            final_boxes.append({"box": [s1, s2, s1 + s3, s2 + s4], "text": extracted_text.strip().replace("fs)", "5").replace("rs)" , "5")})

    table_data = []
    rows = {}

    for box in final_boxes:
        row_y = box["box"][1]
        if row_y not in rows:
            rows[row_y] = []
        rows[row_y].append(box)

    for y in sorted(rows.keys()):  # Sort rows by their Y-coordinates
        table_data.append(rows[y])

    return table_data # Reverse to match expected format


def saveToDb(data_to_insert, uuid):
    """
    Save extracted data to the database.
    """
    return {"type": "response", "response": {"id": uuid, "data": data_to_insert}}
