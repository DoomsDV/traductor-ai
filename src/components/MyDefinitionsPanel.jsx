import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import { apiConfig, buildApiUrl } from '../lib/api';
import { userStore } from '../store/userStore';

function pick(source, ...keys) {
	for (const key of keys) {
		if (source?.[key] !== undefined && source[key] !== null) return source[key];
	}

	return '';
}

function normalizeRows(payload) {
	const data = payload?.data || payload?.items || payload;
	if (!Array.isArray(data)) return [];

	return data.map((item) => ({
		id: Number(pick(item, 'definition_id', 'DEFINITION_ID', 'id', 'ID') || 0),
		word: pick(item, 'word', 'WORD'),
		definitionText: pick(item, 'definition_text', 'DEFINITION_TEXT'),
		contextExample: pick(item, 'context_example', 'CONTEXT_EXAMPLE'),
		upvotes: Number(pick(item, 'upvotes', 'UPVOTES') || 0),
		downvotes: Number(pick(item, 'downvotes', 'DOWNVOTES') || 0),
		status: pick(item, 'status', 'STATUS') || 'ACTIVE',
		dateFormatted: pick(item, 'date_formatted', 'DATE_FORMATTED'),
	}));
}

function formatDateLabel(rawDate) {
	if (!rawDate || typeof rawDate !== 'string') return 'Sin fecha';

	const match = rawDate.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);
	if (!match) return rawDate;

	const day = Number(match[1]);
	const month = Number(match[2]);
	const yearRaw = Number(match[3]);

	if (!Number.isFinite(day) || !Number.isFinite(month) || month < 1 || month > 12) return rawDate;

	const year = match[3].length === 2 ? 2000 + yearRaw : yearRaw;
	const monthLabel = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][month - 1];

	return `${String(day).padStart(2, '0')} ${monthLabel} ${year}`;
}

function VoteIcon({ direction }) {
	const isUp = direction === 'up';

	return (
		<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
			{isUp ? (
				<path d="M9.2 10.6V20H6.4c-1.1 0-2-.9-2-2v-5.4c0-.8.5-1.6 1.3-1.9l3.5-1.2ZM10.8 20V9.8l3.2-5c.3-.5.8-.8 1.3-.8h.2c.9 0 1.6.7 1.6 1.6v2.9h2.5c1.1 0 2 .9 2 2 0 .2 0 .4-.1.6l-1.6 6.4c-.2.9-1 1.5-1.9 1.5h-7.2Z" />
			) : (
				<path d="M14.8 13.4V4H17.6c1.1 0 2 .9 2 2v5.4c0 .8-.5 1.6-1.3 1.9l-3.5 1.2ZM13.2 4v10.2l-3.2 5c-.3.5-.8.8-1.3.8h-.2c-.9 0-1.6-.7-1.6-1.6v-2.9H4.4c-1.1 0-2-.9-2-2 0-.2 0-.4.1-.6l1.6-6.4c.2-.9 1-1.5 1.9-1.5h7.2Z" />
			)}
		</svg>
	);
}

export default function MyDefinitionsPanel() {
	const session = useStore(userStore);
	const [rows, setRows] = useState([]);
	const [status, setStatus] = useState('idle');
	const [message, setMessage] = useState('');

	const userId = Number(session?.userProfile?.user_id || 0);
	const isLoggedIn = Boolean(session?.isLoggedIn && userId > 0);
	const endpoint = useMemo(
		() => (userId > 0 ? buildApiUrl(apiConfig.communityPath, `mis-definiciones/${userId}`) : ''),
		[userId]
	);

	useEffect(() => {
		let ignore = false;

		async function loadMyDefinitions() {
			if (!isLoggedIn || !endpoint) {
				setRows([]);
				setStatus('idle');
				return;
			}

			setStatus('loading');
			setMessage('');

			try {
				const response = await fetch(endpoint);
				const payload = await response.json().catch(() => null);

				if (!response.ok || payload?.status !== 'success') {
					throw new Error(payload?.message || `No se pudieron cargar tus aportes (HTTP ${response.status}).`);
				}

				if (!ignore) {
					setRows(normalizeRows(payload));
					setStatus('success');
				}
			} catch (error) {
				if (!ignore) {
					setStatus('error');
					setMessage(error.message || 'No se pudo conectar con la comunidad.');
				}
			}
		}

		loadMyDefinitions();

		return () => {
			ignore = true;
		};
	}, [isLoggedIn, endpoint]);

	if (!isLoggedIn) {
		return (
			<p className="my-definitions-state">
				Inicia sesion para ver tus aportes en la comunidad.
			</p>
		);
	}

	if (status === 'loading') {
		return <p className="my-definitions-state">Cargando tus definiciones...</p>;
	}

	if (status === 'error') {
		return <p className="my-definitions-state error">{message}</p>;
	}

	if (rows.length === 0) {
		return (
			<p className="my-definitions-state">
				Aun no tienes aportes publicados. Ve a Comunidad y crea tu primera definicion.
			</p>
		);
	}

	return (
		<div className="my-definitions-list">
			{rows.map((row) => (
				<article key={row.id || `${row.word}-${row.dateFormatted}`} className="my-definition-card">
					<header className="my-definition-head">
						<h3>{row.word || 'Sin palabra'}</h3>
						<p className="my-definition-date">
							{(row.status || '').toUpperCase() === 'ACTIVE'
								? formatDateLabel(row.dateFormatted)
								: `${formatDateLabel(row.dateFormatted)} - ${row.status}`}
						</p>
					</header>
					<p className="my-definition-body">{row.definitionText || 'Sin definicion'}</p>
					{row.contextExample ? <blockquote>{row.contextExample}</blockquote> : null}
					<footer className="my-definition-votes" aria-label="Panel de votos">
						<div className="my-definition-vote positive">
							<span className="my-definition-vote-icon">
								<VoteIcon direction="up" />
							</span>
							<div className="my-definition-vote-copy">
								<strong>{row.upvotes}</strong>
								<span>a favor</span>
							</div>
						</div>
						<div className="my-definition-vote negative">
							<span className="my-definition-vote-icon">
								<VoteIcon direction="down" />
							</span>
							<div className="my-definition-vote-copy">
								<strong>{row.downvotes}</strong>
								<span>en contra</span>
							</div>
						</div>
					</footer>
				</article>
			))}
		</div>
	);
}
