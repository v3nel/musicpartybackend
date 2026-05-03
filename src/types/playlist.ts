export interface PlaylistItem {
	isrc: string;
	uri: string;
	name: string;
	artists: Array<{ name: string }>;
}

export interface SpotifyTrack {
	track: {
		external_ids: {
			isrc: string;
		};
		uri: string;
		name: string;
		artists: Array<{ name: string }>;
	};
}
