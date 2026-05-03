export interface JWTPayload {
	email: string;
	iat?: number;
	exp?: number;
}
