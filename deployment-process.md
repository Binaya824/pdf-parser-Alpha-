## _Deployment Process for Pdf-parser_

### Prerequisites

- Ubuntu 20.04 installed on the deployment server.
- Docker and Docker Compose installed on the server. If not, you can follow the official Docker installation guide for Ubuntu: Get Docker


### Clone the Repository
```
git clone https://github.com/Quotus-dev/pdf-parser.git
cd pdf-parser
```

- ### Make changes in .env file
```
cp .env.example .env
```

- ### Build and Start Docker Compose Services (Development)
```
docker-compose -f docker-compose.yaml up --build
```

- ### Build and Start Docker Compose Services (production)
```
docker-compose -f docker-compose.prod.yaml up -d --build
```

- ### Stop and Remove Containers
```bash
docker-compose down
```



- ### Create github secrets
    - pgAdmin: Access pgAdmin in your browser at http://{your_domain}:1001. Log in.
    - Client Application: Access the client application in your browser at http://{your_domain}:5173.
    - Server Application: Access the server application at http://{your_domain}:5050.


