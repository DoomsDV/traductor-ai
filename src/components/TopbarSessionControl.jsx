import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { logoutUser, userStore } from '../store/userStore';

function initialsFromProfile(profile) {
	const base = (profile?.display_name || profile?.email || '').trim();
	if (!base) return 'U';
	const words = base.split(/\s+/).filter(Boolean);
	if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
	return `${words[0].slice(0, 1)}${words[1].slice(0, 1)}`.toUpperCase();
}

export default function TopbarSessionControl() {
	const session = useStore(userStore);
	const [open, setOpen] = useState(false);
	const rootRef = useRef(null);

	useEffect(() => {
		function onDocumentClick(event) {
			if (!rootRef.current?.contains(event.target)) {
				setOpen(false);
			}
		}

		function onEscape(event) {
			if (event.key === 'Escape') setOpen(false);
		}

		document.addEventListener('mousedown', onDocumentClick);
		document.addEventListener('keydown', onEscape);
		return () => {
			document.removeEventListener('mousedown', onDocumentClick);
			document.removeEventListener('keydown', onEscape);
		};
	}, []);

	if (!session?.isLoggedIn) return null;

	const profile = session.userProfile;
	const displayName = profile.display_name || profile.email || 'Mi perfil';
	const avatar = profile.profile_pic_url;
	const reputation = Number(profile.reputation_score || 0);

	return (
		<div className="topbar-session" ref={rootRef}>
			<button
				type="button"
				className="avatar-button"
				onClick={() => setOpen((prev) => !prev)}
				aria-haspopup="menu"
				aria-expanded={open ? 'true' : 'false'}
				aria-label="Abrir menu de cuenta"
				title={displayName}
			>
				{avatar ? (
					<img className="avatar-image" src={avatar} alt={displayName} />
				) : (
					<span className="avatar-fallback">{initialsFromProfile(profile)}</span>
				)}
			</button>

			{open ? (
				<div className="topbar-dropdown" role="menu" aria-label="Menu de cuenta">
					<p className="topbar-dropdown-label" aria-hidden="true">
						{displayName}
					</p>
					<p className="topbar-dropdown-support" aria-hidden="true">
						Puntos de reputación: {reputation}
					</p>
					<a className="topbar-dropdown-item" href="/perfil" role="menuitem" onClick={() => setOpen(false)}>
						Mi perfil
					</a>
					<button
						type="button"
						className="topbar-dropdown-item danger"
						role="menuitem"
						onClick={() => {
							logoutUser();
							setOpen(false);
						}}
					>
						Cerrar sesión
					</button>
				</div>
			) : null}
		</div>
	);
}
