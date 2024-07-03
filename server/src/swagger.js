import swaggerJsDoc from 'swagger-jsdoc';
import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';

const swaggerDocument = YAML.load('src/swagger.yaml');

function swaggerDocs(app, port) {
    // Swagger page
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // Docs in JSON format
    app.get('docs.json', (req, res, next) => {
        res.setHeader('Content-Type', 'application/json');
        res.send();
    });

    console.log(`Docs available at http://localhost:${port}/docs`);
}

export default swaggerDocs;
