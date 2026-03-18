const { exec } = require('child_process');
exec('npx tsc --noEmit', (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    if (error) {
        console.error(`Error: ${error.message}`);
    }
});
