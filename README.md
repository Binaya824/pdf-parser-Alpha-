# PDF Validation and Data Extraction

## Overview

This project focuses on the validation and structured management of PDF documents, with an emphasis on data extraction and storage. Incoming PDFs are subjected to a rigorous validation process against predefined criteria to ensure data integrity. Once validated, relevant data is meticulously extracted from the PDFs. The extracted data, along with the original documents, is systematically stored in a PostgreSQL database, with data formatted in JSON. This end-to-end workflow streamlines data management and retrieval processes, ensuring organized and structured storage.

## Technologies Used

- Node.js: The backend server is built using Node.js, providing a runtime environment for server-side scripting.
- Express.js: Express.js is used to create a robust and scalable web application with routing and middleware capabilities.
- PostgreSQL: PostgreSQL is employed as the database system, offering efficient data storage and retrieval.
- Microservice Architecture: The project is structured as a microservices architecture, allowing for modularity, scalability, and maintainability.

## Workflow

1. **PDF Validation**: Incoming PDFs are validated against predefined criteria to ensure adherence to the required format.

2. **Data Extraction**: Validated PDFs undergo data extraction processes, including text parsing and OCR if necessary, to retrieve pertinent information.

3. **Data Storage**: Extracted data and original PDFs are stored systematically in a PostgreSQL database. Data is formatted in JSON for structured storage.

## Microservices

The project leverages a microservices architecture, dividing functionality into separate services for enhanced scalability and maintainability. Each microservice focuses on a specific aspect of the workflow, such as validation, data extraction, and storage, ensuring efficient operation and easy expansion.

## Usage

To run the microservice-based PDF validation and data extraction system, follow the instructions in the accompanying documentation.

## Contributors

- Quotus


## Entity Diagram

[Link to Entity Diagram](https://www.figma.com/file/Cd3GjbbROn9iyluvEtrfMs/Untitled?type=design&node-id=1%3A521&mode=design&t=rNiBIoEjTwe1MTP4-1)

## Flow Diagram

[Link to Flow Diagram](https://www.figma.com/file/JfRZOWpj24fpFrr0miBtHM/Untitled?type=whiteboard&node-id=0%3A1&t=MsYsx9tDDb23OGL1-1)

# PDF Validation and Data Extraction using ML
