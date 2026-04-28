import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import { apiConfig, buildApiUrl } from '../lib/api';
import { userStore } from '../store/userStore';
import CommentThread from './CommentThread.jsx';
import QueryProvider from './QueryProvider.jsx';

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
		commentCount: Number(pick(item, 'comment_count', 'COMMENT_COUNT') || 0),
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
	return (
		<QueryProvider>
			<MyDefinitionsPanelContent />
		</QueryProvider>
	);
}

function MyDefinitionsPanelContent() {
	const session = useStore(userStore);
	const [rows, setRows] = useState([]);
	const [status, setStatus] = useState('idle');
	const [message, setMessage] = useState('');
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

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

	if (!mounted) {
		return <p className="m-0 rounded-[28px] border border-[#d8e2f8] bg-white p-8 text-center font-semibold text-[#5f6b7a]">Cargando...</p>;
	}

	if (!isLoggedIn) {
		return (
			<p className="m-0 rounded-[28px] border border-[#d8e2f8] bg-white p-8 text-center font-semibold text-[#5f6b7a]">
				Inicia sesión para ver tus aportes en la comunidad.
			</p>
		);
	}

	if (status === 'loading') {
		return <p className="m-0 rounded-[28px] border border-[#d8e2f8] bg-white p-8 text-center font-semibold text-[#5f6b7a]">Cargando tus definiciones...</p>;
	}

	if (status === 'error') {
		return <p className="m-0 rounded-[28px] border border-[#f2b8b5] bg-[#fceeee] p-8 text-center font-semibold text-[#b3261e]">{message}</p>;
	}

	if (rows.length === 0) {
		return (
			<p className="m-0 rounded-[28px] border border-[#d8e2f8] bg-white p-8 text-center font-semibold text-[#5f6b7a]">
				Aún no tienes aportes publicados. Ve a Comunidad y crea tu primera definición.
			</p>
		);
	}

	return (
		<div className="grid gap-4">
			{rows.map((row) => (
				<MyDefinitionCard
					key={row.id || `${row.word}-${row.dateFormatted}`}
					row={row}
					currentUserId={userId}
					isLoggedIn={isLoggedIn}
				/>
			))}
		</div>
	);
}

function MyDefinitionCard({ row, currentUserId, isLoggedIn }) {
	const [commentsOpen, setCommentsOpen] = useState(false);

	return (
		<article className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300">
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
			<footer className="flex flex-wrap items-center justify-between gap-3 mt-4" aria-label="Panel de votos">
				<div className="flex gap-2">
					<div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-sm font-bold text-slate-600 border border-slate-100">
						<VoteIcon direction="up" className="h-4 w-4 text-blue-600 fill-current" />
						{row.upvotes}
					</div>
					<div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-sm font-bold text-slate-600 border border-slate-100">
						<VoteIcon direction="down" className="h-4 w-4 text-red-500 fill-current" />
						{row.downvotes}
					</div>
				</div>

				<button
					type="button"
					className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-[#475569] transition hover:bg-slate-100 hover:text-[#0f172a]"
					onClick={() => setCommentsOpen(!commentsOpen)}
				>
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
					</svg>
					{commentsOpen ? 'Ocultar comentarios' : `${row.commentCount || 0} Comentarios`}
				</button>
			</footer>

			{commentsOpen ? (
				<div className="mt-5 border-t border-slate-100 pt-5">
					<CommentThread definitionId={row.id} currentUserId={currentUserId} isLoggedIn={isLoggedIn} />
				</div>
			) : null}
		</article>
	);
}
