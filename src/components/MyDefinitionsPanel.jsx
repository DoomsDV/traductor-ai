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

	const day = String(Number(match[1])).padStart(2, '0');
	const month = String(Number(match[2])).padStart(2, '0');
	const yearStr = match[3];
	const year = yearStr.length === 4 ? yearStr.slice(-2) : yearStr;

	return `${day}-${month}-${year}`;
}

function VoteIcon({ direction, className }) {
	const isUp = direction === 'up';

	return (
		<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true" className={className || 'h-5 w-5 fill-current'}>
			{isUp ? (
				<path d="M12 5.2 5.5 11.7l1.4 1.4 4.1-4.1V19h2V9l4.1 4.1 1.4-1.4L12 5.2Z" />
			) : (
				<path d="M12 18.8 18.5 12.3l-1.4-1.4-4.1 4.1V5h-2v10l-4.1-4.1-1.4 1.4L12 18.8Z" />
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
				Inicia sesión para ver tus aportes en la comunidad.
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
				Aún no tienes aportes publicados. Ve a Comunidad y crea tu primera definición.
			</p>
		);
	}

	return (
		<div className="grid gap-4">
			{rows.map((row) => (
				<article key={row.id || `${row.word}-${row.dateFormatted}`} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300">
					<header className="flex items-start justify-between gap-4 mb-2">
						<h3 className="m-0 text-xl font-bold tracking-tight text-slate-900">{row.word || 'Sin palabra'}</h3>
						<p className="m-0 text-sm font-semibold text-slate-400 text-right shrink-0">
							{(row.status || '').toUpperCase() === 'ACTIVE'
								? formatDateLabel(row.dateFormatted)
								: `${formatDateLabel(row.dateFormatted)} - ${row.status}`}
						</p>
					</header>
					<p className="m-0 text-[15px] leading-relaxed text-slate-600 mb-3">{row.definitionText || 'Sin definición'}</p>
					{row.contextExample ? (
						<blockquote className="m-0 mb-3 border-l-2 border-blue-200 bg-slate-50 px-4 py-2 italic text-sm text-slate-500 rounded-r-xl">
							{row.contextExample}
						</blockquote>
					) : null}
					<footer className="flex flex-wrap items-center gap-2 mt-4" aria-label="Panel de votos">
						<div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-sm font-bold text-slate-600 border border-slate-100">
							<VoteIcon direction="up" className="h-4 w-4 text-blue-600 fill-current" />
							{row.upvotes}
						</div>
						<div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-sm font-bold text-slate-600 border border-slate-100">
							<VoteIcon direction="down" className="h-4 w-4 text-red-500 fill-current" />
							{row.downvotes}
						</div>
					</footer>
				</article>
			))}
		</div>
	);
}
