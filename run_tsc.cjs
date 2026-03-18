const fs = require('fs');
const { exec } = require('child_process');

exec('npx tsc --noEmit', (error, stdout, stderr) => {
    fs.writeFileSync('tsc_output_node.txt', stdout + '\n' + stderr);
    if (error) {
        console.error(`Error de ejecución: ${error.message}`);
    }
});
