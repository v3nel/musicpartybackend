// Auth responses
export interface AuthResponse {
	ok: number;
	access_token?: string;
	refresh_token?: string;
	error?: unknown;
	id?: string;
}

export type LoginResponse =
	| {
		status: `success`;
		access_token: string;
		refresh_token?: string;
		id: string;
	}
	| {
		status: `invalid_credentials`;
	}
	| {
		status: `error`;
		error: unknown;
	};

export type SignupResponse =
	| {
		status: `success`;
		access_token: string;
		refresh_token: string;
	}
	| {
		status: `already_exists`;
	}
	| {
		status: `error`;
		error: unknown;
	};

export interface StreamAuthResponse {
	message?: string;
	responsecode: number;
	access_token?: string;
	refresh_token?: string;
	error?: unknown;
}
