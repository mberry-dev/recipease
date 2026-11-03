// server.js
// Starts the Recipease web app: the API and the frontend, on one port.

const { createApp } = require('./app');

const PORT = process.env.PORT || 5000;

createApp()
    .then(({ app }) => {
        app.listen(PORT, () => {
            console.log(`Recipease is running at http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('Could not start Recipease:', err);
        process.exit(1);
    });
