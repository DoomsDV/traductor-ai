import { useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { apiConfig, buildApiUrl } from '../lib/api';
import { loginUser, userStore } from '../store/userStore';

function pick(source, ...keys) {
	for (const key of keys) {
		if (source?.[key] !== undefined && source[key] !== null) return source[key];
	}

	return '';
}

function normalizeUserProfile(payload) {
	const row = Array.isArray(payload?.data) ? payload.data[0] : payload?.data || payload?.user || payload || {};

	return {
		user_id: pick(row, 'user_id', 'USER_ID', 'id', 'ID'),
		email: pick(row, 'email', 'EMAIL'),
		display_name: pick(row, 'display_name', 'DISPLAY_NAME', 'name', 'NAME'),
		profile_pic_url: pick(row, 'profile_pic_url', 'PROFILE_PIC_URL', 'picture', 'PICTURE'),
		reputation_score: Number(pick(row, 'reputation_score', 'REPUTATION_SCORE') || 0),
	};
}

export default function GoogleAuthButton() {
	const session = useStore(userStore);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const clientId = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID || '';
	const useCookieSession = import.meta.env.PROD;
	const endpoint = useMemo(() => buildApiUrl(apiConfig.authPath.replace(/\/$/, ''), 'google'), []);

	async function handleSuccess(credentialResponse) {
		const idToken = credentialResponse?.credential;

		if (!idToken) {
			setError('Google no devolvió el token de autenticación.');
			return;
		}

		setLoading(true);
		setError('');

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id_token: idToken }),
				credentials: useCookieSession ? 'include' : 'same-origin',
			});
			const rawBody = await response.text();
			let payload = null;

			if (rawBody) {
				try {
					payload = JSON.parse(rawBody);
				} catch {
					payload = null;
				}
			}

			const code = Number(payload?.code);
			const isSuccessEnvelope = payload?.status === 'success' && code === 200;

			if (!response.ok || !isSuccessEnvelope) {
				const backendMessage =
					payload?.message ||
					(rawBody && rawBody.length < 500 ? rawBody : '') ||
					'No se pudo iniciar sesión con Google.';
				throw new Error(`HTTP ${response.status}: ${backendMessage}`);
			}

			const profile = normalizeUserProfile(payload);
			if (!profile.email) {
				throw new Error('La API no devolvió email del usuario.');
			}

			const didLogin = loginUser(profile);
			if (!didLogin) {
				throw new Error('No se pudo guardar la sesión del usuario.');
			}
		} catch (fetchError) {
			console.error(fetchError);
			setError(fetchError?.message || 'Error inesperado al iniciar sesión.');
		} finally {
			setLoading(false);
		}
	}

	function handleError() {
		setError('No se pudo autenticar con Google.');
	}

	if (!clientId) {
		return <p className="auth-feedback auth-error">Falta configurar PUBLIC_GOOGLE_CLIENT_ID.</p>;
	}

	if (session?.isLoggedIn) {
		return null;
	}

	return (
		<div className="google-auth" style={{ marginTop: '20px', marginBottom: '8px' }}>
			<GoogleOAuthProvider clientId={clientId}>
				<GoogleLogin
					onSuccess={handleSuccess}
					onError={handleError}
					theme="filled_blue"
					text="signin_with"
					shape="pill"
					size="large"
				/>
			</GoogleOAuthProvider>
			{loading ? <p className="auth-feedback">Iniciando sesión...</p> : null}
			{error ? <p className="auth-feedback auth-error">{error}</p> : null}
		</div>
	);
}
