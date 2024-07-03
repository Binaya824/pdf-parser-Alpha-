
import json
import asyncio
import websockets
from module_convert_into_images import convertIntoImages
from module_extract_table import extractTable
# Define a WebSocket handler function to handle incoming connections.
async def websocket_handler(websocket, path):
    try:
        # Handle incoming WebSocket messages
        # request_data = websocket.request_headers
        async for message in websocket:
            parsed_data = json.loads(message)
            response = []
            if(parsed_data['type'] == 'extract_table'):
                objExtractTable = extractTable(parsed_data,websocket)
                extractTableResult = await objExtractTable.extract_table_multiprocessor()
                response = extractTableResult
                
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
