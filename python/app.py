
import json
import asyncio
import websockets
from module_convert_into_images import convertIntoImages
from module_extract_table import extract_table_multiprocessor
# Define a WebSocket handler function to handle incoming connections.
async def websocket_handler(websocket, path):
    try:
        # Handle incoming WebSocket messages
        # request_data = websocket.request_headers
        async for message in websocket:
            parsed_data = json.loads(message)
            response = []
            if(parsed_data['type'] == 'extract_table'):
                response = await extract_table_multiprocessor(parsed_data,websocket)
                # print("-----------------------------------------------------> " , objExtractTable)
                # extractTableResult = await objExtractTable.extract_table_multiprocessor()
                # response = extractTableResult
                print("object extracted============================================================================:::::::::::>>>>>>>>>>" , response)
                
            else:
                response = {}
                try:
                    obj = convertIntoImages(parsed_data['file_dir'],parsed_data['output_dir'])
                    response = await obj.public_extract_page_from_pdf()
                    obj.cleanup
                except Exception as e:
                    # Code to handle any type of exception
                    response = {'type':'error','response':str(e)}
            # print(table_id,"table_id",flush=True)
            await websocket.send(json.dumps(response))
            await websocket.close()
    except websockets.exceptions.ConnectionClosedError:
        pass
# Start the WebSocket server

print("Starting WebSocket server on 0.0.0.0:5151",flush=True)

start_server = websockets.serve(websocket_handler, "0.0.0.0", 5151)

# Create an event loop and run the server
loop = asyncio.get_event_loop()
loop.run_until_complete(start_server)
loop.run_forever()
