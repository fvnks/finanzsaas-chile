const fs = require('fs');
const filePath = 'c:/Users/ceefv/OneDrive/Documentos/finanzsaas-chile/pages/InvoicesPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');
if (!content.startsWith("import React")) {
    content = "import React, { useState, useMemo, useEffect, useRef } from 'react';\n" + content;
    fs.writeFileSync(filePath, content);
    console.log("Added React import to InvoicesPage.tsx");
} else {
    console.log("React import already exists in InvoicesPage.tsx");
}
