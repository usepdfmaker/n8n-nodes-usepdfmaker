# n8n-nodes-usepdfmaker

This is an n8n community node for [UsePDFMaker](https://usepdfmaker.com) — a developer-first PDF conversion REST API.

## Installation

In your n8n instance, go to **Settings → Community Nodes** and install:

## Operations

- **HTML to PDF** — Convert HTML content to a PDF file
- **URL to PDF** — Convert any web page URL to a PDF file
- **Document to PDF** — Convert DOCX, XLSX, or PPTX files to PDF

## Credentials

You need a UsePDFMaker API key. Get one for free at [app.usepdfmaker.com/dashboard](https://app.usepdfmaker.com/dashboard).

In n8n, create a new **UsePDFMaker API** credential and paste your API key into the **API Key** field.

## Usage Example: HTML to PDF

1. Add a **UsePDFMaker** node to your workflow.
2. Select the **HTML to PDF** operation.
3. In the **HTML Content** field, enter your HTML, for example:
```html
   <h1>Invoice #1024</h1>
   <p>Total due: $250.00</p>
```
4. Connect your UsePDFMaker API credential.
5. Run the node. The output will contain a binary field named `data` with the generated `output.pdf` file, which you can save, email, or upload using any other n8n node.

## Resources

- [UsePDFMaker API Docs](https://usepdfmaker.com/docs)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)

## License

MIT