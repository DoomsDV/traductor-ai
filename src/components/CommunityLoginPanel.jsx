import { useStore } from '@nanostores/react';
import GoogleAuthButton from './GoogleAuthButton';
import { userStore } from '../store/userStore';

function getShortName(profile) {
	const full = (profile?.display_name || profile?.email || '').trim();
	if (!full) return 'amigo';
	return full.split(/\s+/)[0];
}

export default function CommunityLoginPanel() {
	const session = useStore(userStore);
	const isLoggedIn = Boolean(session?.isLoggedIn);
	const reputation = Number(session?.userProfile?.reputation_score || 0);
	const shortName = getShortName(session?.userProfile);

	function openCreateDefinition() {
		window.dispatchEvent(new CustomEvent('community-open-create'));
	}

	if (!isLoggedIn) {
		return (
			<>
				<h2>Participa en la comunidad</h2>
				<p>Inicia sesion para crear tus propias definiciones y votar las mejores entradas.</p>
				<GoogleAuthButton />
			</>
		);
	}

	return (
		<>
			<h2>Mba'eichapa, {shortName}!</h2>
			<p className="login-reputation">Reputacion: {reputation} pts</p>
			<button type="button" className="login-cta" onClick={openCreateDefinition}>
				Aportar nueva definicion
			</button>
		</>
	);
}
