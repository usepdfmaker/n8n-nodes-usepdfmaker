import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class UsePdfMakerApi implements ICredentialType {
	name = 'usePdfMakerApi';
	displayName = 'UsePDFMaker API';
	documentationUrl = 'https://usepdfmaker.com/docs';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your UsePDFMaker API key. Get it from https://app.usepdfmaker.com/dashboard',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.usepdfmaker.com',
			url: '/v1/usage',
			method: 'GET',
		},
	};
}
