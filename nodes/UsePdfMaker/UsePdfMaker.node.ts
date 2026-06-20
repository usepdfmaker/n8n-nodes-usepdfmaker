import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
NodeApiError,
JsonObject,
} from 'n8n-workflow';

const API_BASE_URL = 'https://api.usepdfmaker.com';

function isPdfBuffer(buffer: Buffer): boolean {
	return buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF';
}

async function resolvePdfBuffer(
	this: IExecuteFunctions,
	postBody: Buffer,
): Promise<Buffer> {
	if (isPdfBuffer(postBody)) {
		return postBody;
	}

	let parsed: { pdf_url?: string };
	try {
		parsed = JSON.parse(postBody.toString('utf-8')) as { pdf_url?: string };
	} catch {
		throw new NodeOperationError(
			this.getNode(),
			'UsePDFMaker convert response is neither PDF bytes nor JSON with pdf_url.',
		);
	}

	const pdfUrl = typeof parsed.pdf_url === 'string' ? parsed.pdf_url.trim() : '';
	if (!pdfUrl) {
		throw new NodeOperationError(
			this.getNode(),
			'UsePDFMaker convert response JSON is missing pdf_url.',
		);
	}

	const downloadUrl = pdfUrl.startsWith('http')
		? pdfUrl
		: `${API_BASE_URL}${pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`}`;

	const downloadResponse = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'usePdfMakerApi',
		{
			method: 'GET',
			url: downloadUrl,
			encoding: 'arraybuffer',
			returnFullResponse: true,
		} as never,
	);

	const pdfBuffer = Buffer.from((downloadResponse as { body: ArrayBuffer }).body);
	if (!isPdfBuffer(pdfBuffer)) {
		throw new NodeOperationError(
			this.getNode(),
			'UsePDFMaker PDF download did not return valid PDF bytes.',
		);
	}

	return pdfBuffer;
}

export class UsePdfMaker implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'UsePDFMaker',
		name: 'usePdfMaker',
		icon: 'file:usepdfmaker.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Convert HTML, URLs and documents to PDF using UsePDFMaker API',
		defaults: {
			name: 'UsePDFMaker',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'usePdfMakerApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'HTML to PDF',
						value: 'htmlToPdf',
						description: 'Convert HTML content to PDF',
						action: 'Convert HTML to PDF',
					},
					{
						name: 'URL to PDF',
						value: 'urlToPdf',
						description: 'Convert a URL to PDF',
						action: 'Convert URL to PDF',
					},
					{
						name: 'Document to PDF',
						value: 'documentToPdf',
						description: 'Convert DOCX, XLSX or PPTX to PDF',
						action: 'Convert document to PDF',
					},
				],
				default: 'htmlToPdf',
			},
			{
				displayName: 'HTML Content',
				name: 'html',
				type: 'string',
				typeOptions: { rows: 10 },
				default: '',
				required: true,
				displayOptions: { show: { operation: ['htmlToPdf'] } },
				description: 'The HTML content to convert to PDF',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['urlToPdf'] } },
				description: 'The URL to convert to PDF',
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: { show: { operation: ['documentToPdf'] } },
				description: 'Name of the binary field containing the document to convert',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Output Binary Field',
						name: 'outputBinaryPropertyName',
						type: 'string',
						default: 'data',
						description: 'Name of the binary field to store the output PDF',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			const options = this.getNodeParameter('options', i) as {
				outputBinaryPropertyName?: string;
			};
			const outputField = options.outputBinaryPropertyName || 'data';

			try {
				let requestOptions: Record<string, unknown> = {};

				if (operation === 'htmlToPdf') {
					const html = this.getNodeParameter('html', i) as string;
					const base64 = Buffer.from(html, 'utf-8').toString('base64');
					requestOptions = {
						method: 'POST',
						url: 'https://api.usepdfmaker.com/v1/convert',
						headers: { 'Content-Type': 'application/json' },
						body: { file: base64, filename: 'index.html' },
						encoding: 'arraybuffer',
						returnFullResponse: true,
					};
				} else if (operation === 'urlToPdf') {
					const url = this.getNodeParameter('url', i) as string;
					requestOptions = {
						method: 'POST',
						url: 'https://api.usepdfmaker.com/v1/convert',
						headers: { 'Content-Type': 'application/json' },
						body: { url },
						encoding: 'arraybuffer',
						returnFullResponse: true,
					};
				} else if (operation === 'documentToPdf') {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
					const fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
					const base64 = fileBuffer.toString('base64');
					requestOptions = {
						method: 'POST',
						url: 'https://api.usepdfmaker.com/v1/convert',
						headers: { 'Content-Type': 'application/json' },
						body: {
							file: base64,
							filename: binaryData.fileName || 'document.docx',
						},
						encoding: 'arraybuffer',
						returnFullResponse: true,
					};
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}

				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'usePdfMakerApi',
					requestOptions as never,
				);

				const fullResponse = response as { body: ArrayBuffer; statusCode: number };
				const responseBody = Buffer.from(fullResponse.body);
				const responseData = await resolvePdfBuffer.call(this, responseBody);

				const binaryOutput = await this.helpers.prepareBinaryData(
					responseData,
					'output.pdf',
					'application/pdf',
				);
				binaryOutput.fileName = 'output.pdf';
				delete binaryOutput.fileExtension;
				binaryOutput.mimeType = 'application/pdf';

				returnData.push({
					json: { success: true, operation },
					binary: { [outputField]: binaryOutput },
				});

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				if (error instanceof NodeOperationError) {
throw error;
}
throw new NodeApiError(this.getNode(), error as JsonObject);
			}
		}

		return [returnData];
	}
}


