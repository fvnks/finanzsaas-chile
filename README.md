# Vertikal Finanzas - ERP & Facturación Electrónica

Este proyecto es una plataforma integral de gestión tributaria y operativa diseñada para el mercado chileno. Permite la gestión de facturas (Venta/Compra), Clientes, Centros de Costo, Proyectos y Capital Humano (Cuadrillas).

## 🚀 Arquitectura Técnica (IMPORTANTE PARA CURSOR/IA)

Este proyecto NO utiliza bundlers (Webpack/Vite). Se basa en **Native ES Modules** y **React 19** cargado dinámicamente.

### ⚠️ Reglas Críticas de Desarrollo

1.  **Extensiones en Imports**: Debido a que el navegador resuelve los módulos directamente, **TODAS** las importaciones locales deben incluir la extensión del archivo.
    *   ❌ `import App from './App';`
    *   ✅ `import App from './App.tsx';`
2.  **Versiones de React**: No cambiar las versiones en `index.html`. El proyecto utiliza `react@19.0.0` y `react-dom@19.0.0` vía `esm.sh`. Cualquier discrepancia causará una **pantalla blanca**.
3.  **Import Map**: El archivo `index.html` centraliza las dependencias. Si se añade una librería nueva, debe registrarse ahí primero.
4.  **Punto de Entrada**: El flujo de carga es: `index.html` -> `index.tsx` -> `App.tsx`.

## 🛠️ Stack Tecnológico

*   **Frontend**: React 19 (Functional Components & Hooks).
*   **Estilos**: Tailwind CSS (vía CDN).
*   **Iconos**: Lucide React.
*   **Gráficos**: Recharts.
*   **IA**: Google Gemini API (@google/genai) para generación de Branding.

## 📂 Estructura de Archivos

*   `/components`: Componentes reutilizables (Sidebar, etc).
*   `/pages`: Vistas principales de la aplicación.
*   `/services`: Lógica de integración con APIs externas (Gemini).
*   `types.ts`: Definiciones de interfaces de TypeScript (Contrato de datos).
*   `constants.ts`: Lógica de validación de RUT, formateo CLP e IVA.

## 🇨🇱 Especificaciones de Negocio (Chile)

*   **RUT**: Validación mediante algoritmo de módulo 11 (implementado en `constants.ts`).
*   **IVA**: Tasa fija del 19% (`IVA_RATE`).
*   **Moneda**: Formateo en Pesos Chilenos (CLP).
*   **SII**: La aplicación simula la validación de documentos electrónicos.

## 🔧 Resolución de Problemas (Pantalla Blanca)

Si la aplicación no carga:
1. Revisa la consola del navegador (`F12`).
2. Verifica que no falten extensiones `.tsx` en los archivos modificados recientemente.
3. Asegura que el `importmap` en `index.html` tenga las versiones de `react` y `react-dom` sincronizadas exactamente en `19.0.0`.
4. Verifica que `process.env.API_KEY` esté disponible antes de llamar a servicios de IA.
