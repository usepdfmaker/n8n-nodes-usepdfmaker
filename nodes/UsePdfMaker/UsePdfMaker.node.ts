import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

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
						displayName: 'Page Size',
						name: 'pageSize',
						type: 'options',
						options: [
							{ name: 'A4', value: 'A4' },
							{ name: 'A3', value: 'A3' },
							{ name: 'Letter', value: 'Letter' },
							{ name: 'Legal', value: 'Legal' },
						],
						default: 'A4',
						description: 'Page size of the output PDF',
					},
					{
						displayName: 'Landscape',
						name: 'landscape',
						type: 'boolean',
						default: false,
						description: 'Whether to use landscape orientation',
					},
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
				pageSize?: string;
				landscape?: boolean;
				outputBinaryPropertyName?: string;
			};
			const outputField = options.outputBinaryPropertyName || 'data';

			let responseData: Buffer;

			try {
				if (operation === 'htmlToPdf') {
					const html = this.getNodeParameter('html', i) as string;

					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'usePdfMakerApi',
						{
							method: 'POST',
							url: 'https://api.usepdfmaker.com/v1/convert/html',
							headers: { 'Content-Type': 'application/json' },
							body: {
								html,
								options: {
									format: options.pageSize || 'A4',
									landscape: options.landscape || false,
								},
							},
							encoding: 'arraybuffer',
							returnFullResponse: false,
						},
					);

					responseData = Buffer.from(response as ArrayBuffer);

				} else if (operation === 'urlToPdf') {
					const url = this.getNodeParameter('url', i) as string;

					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'usePdfMakerApi',
						{
							method: 'POST',
							url: 'https://api.usepdfmaker.com/v1/convert/url',
							headers: { 'Content-Type': 'application/json' },
							body: {
								url,
								options: {
									format: options.pageSize || 'A4',
									landscape: options.landscape || false,
								},
							},
							encoding: 'arraybuffer',
							returnFullResponse: false,
						},
					);

					responseData = Buffer.from(response as ArrayBuffer);

				} else if (operation === 'documentToPdf') {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
					const fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'usePdfMakerApi',
						{
							method: 'POST',
							url: 'https://api.usepdfmaker.com/v1/convert/document',
							headers: { 'Content-Type': 'multipart/form-data' },
							body: {
								file: {
									value: fileBuffer,
									options: {
										filename: binaryData.fileName || 'document',
										contentType: binaryData.mimeType,
									},
								},
							},
							encoding: 'arraybuffer',
							returnFullResponse: false,
						},
					);

					responseData = Buffer.from(response as ArrayBuffer);

				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}

				const binaryOutput = await this.helpers.prepareBinaryData(
					responseData,
					'output.pdf',
					'application/pdf',
				);

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
				throw error;
			}
		}

		return [returnData];
	}
}
