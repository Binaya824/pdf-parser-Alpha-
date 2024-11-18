import fitz 
import os
import io
from PIL import Image, ImageDraw, ImageFont
from multiprocessing import Pool, cpu_count
import glob
import firebase_admin
from firebase_admin import credentials, storage,initialize_app
import time
# Initialize Firebase Admin SDK
from itertools import chain
import asyncio
import psycopg2
import json
import uuid
from uuid import UUID

# try:
#     cred = credentials.Certificate({
#         "type": "service_account",
#         "project_id": os.environ.get('PROJECT_ID'),
#         "private_key_id": os.environ.get('PRIVATE_KEY_ID'),
#         "private_key": os.environ.get('PRIVATE_KEY').replace(r'\n', '\n'),
#         "client_email": os.environ.get('CLIENT_EMAIL'),
#         "client_id": os.environ.get('CLIENT_ID'),
#         "auth_uri": "https://accounts.google.com/o/oauth2/auth",
#         "token_uri": "https://oauth2.googleapis.com/token",
#         "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
#         "client_x509_cert_url": os.environ.get('CLIENT_X509_URL'),
#         "universe_domain": "googleapis.com"
#     })

#     initialize_app(
#         cred, {'storageBucket': "pdf-parser-mjunction.appspot.com", })
#     print('Success fully connected to firebase ', flush=True)

# except Exception as e:
#     print('unable to connect to firebase', flush=True)


def convert_pdf_to_image(input_pdf, output_directory, page_number):
    base_images = []
    try:
        pdf_document = fitz.open(input_pdf)
    except Exception as e:
        return {'type': 'error', 'response': str(e)}

    # Get the page
    page = pdf_document.load_page(page_number)
    image = page.get_pixmap(matrix=fitz.Matrix(100/100, 100/100), dpi=425)
    image_filename = os.path.join(output_directory, f'page_{page_number + 1}.png')

    for img_index, img in enumerate(page.get_images(full=True)):
        xref = img[0]
        base_image = pdf_document.extract_image(xref)
        image_data = base_image["image"]
        image_inside_page = Image.open(io.BytesIO(image_data))
        pdf_images_per_page_path = os.path.join(output_directory, str(page_number + 1))

        if not os.path.exists(pdf_images_per_page_path):
            os.makedirs(pdf_images_per_page_path)

        img_filename = os.path.join(pdf_images_per_page_path, f'page_{page_number + 1}_img_{img_index}.png')
        image_inside_page.save(img_filename)

        object_id, _, x_min, y_min, width, _, _, _, _, _ = img
        top_right_x = x_min + width
        top_right_y = y_min + image_inside_page.height
        bounding_box = [x_min, y_min, top_right_x, top_right_y]

        if width * image_inside_page.height > 430:
            base_images.append({'img_filename': img_filename, 'bbox': bounding_box})

    image.save(image_filename)
    pdf_document.close()
    return {'base_images': base_images, 'page_number': page_number + 1}

  
def crop_header(image_path, header_percent=5):
    """
    Crops the header of the image by the given percentage.

    :param image_path: Path to the image file.
    :param header_percent: Percentage of the image height to crop from the top.
    :return: None
    """
    try:
        with Image.open(image_path) as img:
            width, height = img.size
            print(f"Original size of {image_path}: {width}x{height}")

            # Calculate the pixel values for cropping based on the given percentage
            header_height = int(height * (header_percent / 100))

            cropping_box = (0, header_height, width, height)
            cropped_img = img.crop(cropping_box)
            cropped_img.save(image_path)
            print(f"Cropped size of {image_path}: {cropped_img.size}")
    except Exception as e:
        print(f"Error cropping image {image_path}: {str(e)}")


async def upload_image(file_path, input_pdf,UploadType,output_dir):
    # Get a reference to the Firebase Storage service
    try:
       file_array = {}
       if(UploadType == 'base_image'):
            new_data = []
            for item in file_path:
                new_data.append(item['base_images'])
            flat_list = list(chain.from_iterable(new_data))
            for item in flat_list:
                bucket = storage.bucket()
                blob = bucket.blob(item['img_filename'])
                blob.upload_from_filename(item['img_filename'])
                # time.sleep(5) 
            
            file_array['pdf_file'] = output_dir + '/'+ os.path.basename(input_pdf)
            for element in file_path:
                # print('',flush=True)
                file_array[element['page_number']] = element['base_images']
            
            folder_id = output_dir[output_dir.rfind("/") + 1:]
            # saveToDb(file_array,folder_id)
       else:
            bucket = storage.bucket()
            blob = bucket.blob(file_path + '/'+ os.path.basename(input_pdf))
            blob.upload_from_filename(input_pdf)
            # time.sleep(5)

    except Exception as e:
        # Code to handle any type of exception
        print(e,flush=True)



def saveToDb(data_to_insert,folder_id):
        db_params = {
            'dbname': os.environ.get('POSTGRES_DB'),
            'user': os.environ.get('POSTGRES_USER'),
            'password': os.environ.get('POSTGRES_PASSWORD'),
            'host': os.environ.get('POSTGRES_HOST'),  # Typically 'localhost' if the database is on the same machine
            'port': os.environ.get('POSTGRES_PORT'),  # Default PostgreSQL port
        }
        
        # Connect to the database
        conn = psycopg2.connect(**db_params)
        insert_query = 'INSERT INTO "Files" (id,folder_id,data, "createdAt", "updatedAt") VALUES (%s,%s, %s, %s,%s);'
        
        # Convert the JSON object to a JSON string
        from datetime import datetime
        created_at = updated_at = datetime.now()
        # print(json.dumps(data_to_insert['table']), flush=True)
        try:
            cursor = conn.cursor()
            query_with_values = cursor.mogrify(insert_query, (uuid.uuid4().hex,folder_id,json.dumps(data_to_insert),created_at,updated_at))
            # print("Raw SQL Query:", query_with_values.decode('utf-8'))
            cursor.execute(query_with_values)
            # inserted_id = cursor.fetchone()[0]
            conn.commit()
        except psycopg2.Error as e:
        # Handle the exception
            print(e,flush=True)
            if 'cursor' in locals():
                cursor.close()
            conn.close()
            return {'error':str(e)}
            # print(e,flush=True)
            
        finally:
        # Close the cursor and database connection
            if 'cursor' in locals():
                cursor.close()
        conn.close()
        
class convertIntoImages:
    
    def __init__(self,input_dir,out_dir):
        # Instance attribute
        self.input_pdf = input_dir
        self.output_directory = out_dir
        # self.pool = Pool()

    async def public_extract_page_from_pdf(self):        
        try:
            pdf_document = fitz.open(self.input_pdf)
        except Exception as e:
            # Code to handle any type of exception
            return {'type':'error','response':str(e)}
        
        num_processes = max(1, round(cpu_count() / 2))
        # asyncio.create_task(upload_image(self.output_directory,self.input_pdf,'main_pdf','')) 
        with Pool(processes=num_processes) as pool:
            # Define multiple input values as a list of tuples
            pages_to_process = [(self.input_pdf,self.output_directory,i) for i in range(pdf_document.page_count)]

            # Use the starmap function to apply the extract_pdf_images function to each input tuple
            result = pool.starmap(convert_pdf_to_image, pages_to_process)
        # print(result,flush=True)
        # await upload_image(result,'','base_image')
        # asyncio.create_task(upload_image(result,self.input_pdf,'base_image',self.output_directory)) 
        
        image_extensions = ['jpg', 'jpeg', 'png', 'gif']

        # Use glob to find all files with the specified extensions in the directory
  
        image_files = []
        for extension in image_extensions:
            pattern = os.path.join(self.output_directory, f'*.{extension}')
            image_files.extend(glob.glob(pattern))
        
        
        # Define a function to extract the page number from a file path
        def get_page_number(file_path):
            filename = os.path.basename(file_path)
            parts = filename.split('_')
            if len(parts) > 1:
                page_number = parts[1].split('.')[0]
                return int(page_number)
            return 0

        # Sort the list of image files based on the page number
        image_files.sort(key=get_page_number)
        # Crop only the header from each image with percentage cropping
        for image_file in image_files:
            crop_header(image_file, header_percent=10)
        return {'type':'response','response':image_files}
    
    def cleanup(self):
        self.pool.close()
        self.pool.join()