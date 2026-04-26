const DEFAULT_API_BASE_URL =
	'https://g9549f707e8ebfa-aox.adb.sa-saopaulo-1.oraclecloudapps.com/ords/traductor_ia';

export const apiConfig = {
	baseUrl: import.meta.env.PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL,
	authPath: import.meta.env.PUBLIC_API_AUTH_V1 || '/auth/v1',
	translatePath: import.meta.env.PUBLIC_API_TRANSLATE_V1 || '/ai/v1',
	communityPath: import.meta.env.PUBLIC_API_COMMUNITY_V1 || '/community/v1',
};

export function buildApiUrl(path, resource = '') {
	const base = apiConfig.baseUrl.replace(/\/$/, '');
	const modulePath = path.startsWith('/') ? path : `/${path}`;
	const resourcePath = resource
		? resource.startsWith('/')
			? resource
			: `/${resource}`
		: '';

	return `${base}${modulePath}${resourcePath}`;
}
