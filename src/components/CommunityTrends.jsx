import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import { apiConfig, buildApiUrl } from '../lib/api';
import { userStore } from '../store/userStore';

function pick(item, ...keys) {
	for (const key of keys) {
		if (item?.[key] !== undefined && item[key] !== null) return item[key];
	}

	return '';
}

function normalizeRows(payload) {
	const data = payload?.data || payload?.items || payload;
	if (!Array.isArray(data)) return [];

	return data.map((item) => ({
		id: Number(pick(item, 'definition_id', 'DEFINITION_ID', 'id', 'ID') || 0),
		word: pick(item, 'word', 'WORD'),
		definition: pick(item, 'definition', 'DEFINITION'),
		example: pick(item, 'example', 'EXAMPLE'),
		upvotes: Number(pick(item, 'upvotes', 'UPVOTES') || 0),
		downvotes: Number(pick(item, 'downvotes', 'DOWNVOTES') || 0),
		score: Number(pick(item, 'score', 'SCORE') || 0),
		author: pick(item, 'author', 'AUTHOR'),
		userVote: Number(pick(item, 'user_vote', 'USER_VOTE', 'vote_value', 'VOTE_VALUE') || 0),
	}));
}

function parseApiError(response, payload, fallbackMessage) {
	const message = payload?.message || fallbackMessage;
	return `HTTP ${response.status}: ${message}`;
}

export default function CommunityTrends() {
	const session = useStore(userStore);
	const [activeTab, setActiveTab] = useState('top');
	const [trends, setTrends] = useState([]);
	const [status, setStatus] = useState('loading');
	const [message, setMessage] = useState('');
	const [actionMessage, setActionMessage] = useState('');
	const [actionError, setActionError] = useState('');
	const [votingId, setVotingId] = useState(0);
	const [creating, setCreating] = useState(false);
	const [userVotes, setUserVotes] = useState({});

	const [wordText, setWordText] = useState('');
	const [definitionText, setDefinitionText] = useState('');
	const [contextExample, setContextExample] = useState('');

	const trendsEndpoint = useMemo(() => buildApiUrl(apiConfig.communityPath, '/trends'), []);
	const voteEndpoint = useMemo(() => buildApiUrl(apiConfig.communityPath, '/votes'), []);
	const definitionEndpoint = useMemo(() => buildApiUrl(apiConfig.communityPath, '/definitions'), []);

	const userId = Number(session?.userProfile?.user_id || 0);
	const isLoggedIn = Boolean(session?.isLoggedIn && userId > 0);
	const canSubmitDefinition = Boolean(isLoggedIn && wordText.trim() && definitionText.trim() && !creating);

	const loadTrends = useCallback(async () => {
		setStatus('loading');
		setMessage('');

		try {
			const response = await fetch(trendsEndpoint);
			const payload = await response.json().catch(() => null);

			if (!response.ok || payload?.status === 'error') {
				throw new Error(parseApiError(response, payload, 'No se pudieron cargar las tendencias.'));
			}

			setTrends(normalizeRows(payload));
			setStatus('success');
		} catch (error) {
			setStatus('error');
			setMessage(error.message || 'No se pudo conectar con la comunidad.');
		}
	}, [trendsEndpoint]);

	useEffect(() => {
		loadTrends();
	}, [loadTrends]);

	useEffect(() => {
		function onOpenCreate() {
			setActiveTab('create');
		}

		window.addEventListener('community-open-create', onOpenCreate);
		return () => window.removeEventListener('community-open-create', onOpenCreate);
	}, []);

	useEffect(() => {
		if (!isLoggedIn) {
			setUserVotes({});
		}
	}, [isLoggedIn, userId]);

	function resolveVoteState(currentVote, requestedVote, responseMessage) {
		const messageLower = String(responseMessage || '').toLowerCase();

		if (messageLower.includes('eliminado')) return 0;
		if (messageLower.includes('cambiado')) return requestedVote;
		if (messageLower.includes('nuevo')) return requestedVote;

		if (currentVote === requestedVote) return 0;
		return requestedVote;
	}

	function getCurrentVote(definitionId) {
		if (Object.prototype.hasOwnProperty.call(userVotes, definitionId)) {
			return Number(userVotes[definitionId] || 0);
		}

		const currentTrend = trends.find((item) => item.id === definitionId);
		return Number(currentTrend?.userVote || 0);
	}

	async function handleVote(definitionId, voteValue) {
		if (!isLoggedIn) {
			setActionError('Debes iniciar sesión para votar.');
			return;
		}

		setVotingId(definitionId);
		setActionError('');
		setActionMessage('');

		try {
			const response = await fetch(voteEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user_id: userId,
					definition_id: definitionId,
					vote_value: voteValue,
				}),
			});
			const payload = await response.json().catch(() => null);

			if (!response.ok || payload?.status === 'error') {
				throw new Error(parseApiError(response, payload, 'No se pudo registrar el voto.'));
			}

			const apiMessage = payload?.message || 'Voto registrado.';
			const currentVote = getCurrentVote(definitionId);
			const nextVote = resolveVoteState(currentVote, voteValue, apiMessage);

			setUserVotes((prev) => ({
				...prev,
				[definitionId]: nextVote,
			}));
			setActionMessage(apiMessage);
			await loadTrends();
		} catch (error) {
			setActionError(error.message || 'No se pudo registrar el voto.');
		} finally {
			setVotingId(0);
		}
	}

	async function handleCreateDefinition(event) {
		event.preventDefault();

		if (!isLoggedIn) {
			setActionError('Debes iniciar sesión para crear definiciones.');
			return;
		}

		setCreating(true);
		setActionError('');
		setActionMessage('');

		try {
			const response = await fetch(definitionEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user_id: userId,
					word_text: wordText.trim(),
					definition_text: definitionText.trim(),
					context_example: contextExample.trim(),
				}),
			});
			const payload = await response.json().catch(() => null);

			if (!response.ok || payload?.status === 'error') {
				throw new Error(parseApiError(response, payload, 'No se pudo crear la definición.'));
			}

			setActionMessage(payload?.message || 'Definición creada.');
			setWordText('');
			setDefinitionText('');
			setContextExample('');
			setActiveTab('top');
			await loadTrends();
		} catch (error) {
			setActionError(error.message || 'No se pudo crear la definicion.');
		} finally {
			setCreating(false);
		}
	}

	return (
		<div className="community-hub">
			<div className="community-tools">
				<div className="community-tabs" role="tablist" aria-label="Secciones de comunidad">
					<button
						type="button"
						className={`community-tab ${activeTab === 'top' ? 'active' : ''}`}
						onClick={() => setActiveTab('top')}
					>
						Top 50
					</button>
					<button
						type="button"
						className={`community-tab ${activeTab === 'create' ? 'active' : ''}`}
						onClick={() => setActiveTab('create')}
					>
						Crear definición
					</button>
				</div>
			</div>

			{actionMessage ? <p className="community-feedback">{actionMessage}</p> : null}
			{actionError ? <p className="community-feedback error">{actionError}</p> : null}

			{activeTab === 'create' ? (
				<form className="definition-form" onSubmit={handleCreateDefinition}>
					<label>
						Palabra
						<input
							type="text"
							value={wordText}
							onChange={(event) => setWordText(event.target.value)}
							maxLength={100}
							placeholder="Ej: Mba'éichapa"
							required
						/>
					</label>
					<label>
						Definición
						<textarea
							value={definitionText}
							onChange={(event) => setDefinitionText(event.target.value)}
							maxLength={1000}
							rows={4}
							placeholder="Escribe la definición en español o jopara."
							required
						/>
					</label>
					<label>
						Ejemplo (opcional)
						<textarea
							value={contextExample}
							onChange={(event) => setContextExample(event.target.value)}
							maxLength={1000}
							rows={3}
							placeholder="Ejemplo de uso en contexto."
						/>
					</label>
					<button type="submit" className="definition-submit" disabled={!canSubmitDefinition}>
						{creating ? 'Publicando...' : 'Publicar definición'}
					</button>
				</form>
			) : null}

			{activeTab === 'top' ? (
				<>
					{status === 'loading' ? <p className="trend-state">Cargando tendencias...</p> : null}
					{status === 'error' ? <p className="trend-state trend-error">{message}</p> : null}
					{status === 'success' && trends.length === 0 ? (
						<p className="trend-state trend-empty">
							Aún no hay tendencias publicadas. Sé el primero en compartir una definición para la
							comunidad.
						</p>
					) : null}
					{status === 'success' && trends.length > 0 ? (
						<div className="trend-list">
							{trends.map((trend) => {
								const selectedVote = Number(userVotes[trend.id] ?? trend.userVote ?? 0);
								const upvoteClass = `vote-button up ${selectedVote === 1 ? 'active-up' : ''}`;
								const downvoteClass = `vote-button down ${selectedVote === -1 ? 'active-down' : ''}`;

								return (
									<article className="trend-card" key={trend.id || `${trend.word}-${trend.definition}`}>
									<div className="trend-score" aria-label={`${trend.score} puntos`}>
										<strong>{trend.score}</strong>
										<span>pts</span>
									</div>
									<div className="trend-content">
										<div className="trend-heading">
											<h2>{trend.word}</h2>
											<span>{trend.author || 'Comunidad'}</span>
										</div>
										<p>{trend.definition}</p>
										{trend.example ? <q>{trend.example}</q> : null}
										<div className="trend-votes">
											<span>{trend.upvotes} a favor</span>
											<span>{trend.downvotes} en contra</span>
										</div>
										<div className="trend-actions">
											<button
												type="button"
												className={upvoteClass}
												onClick={() => handleVote(trend.id, 1)}
												disabled={!isLoggedIn || votingId === trend.id}
												aria-label="Votar a favor"
												title="Votar a favor"
											>
												<svg viewBox="0 0 24 24" aria-hidden="true">
													<path d="M12 5.2 5.5 11.7l1.4 1.4 4.1-4.1V19h2V9l4.1 4.1 1.4-1.4L12 5.2Z" />
												</svg>
											</button>
											<button
												type="button"
												className={downvoteClass}
												onClick={() => handleVote(trend.id, -1)}
												disabled={!isLoggedIn || votingId === trend.id}
												aria-label="Votar en contra"
												title="Votar en contra"
											>
												<svg viewBox="0 0 24 24" aria-hidden="true">
													<path d="M12 18.8 18.5 12.3l-1.4-1.4-4.1 4.1V5h-2v10l-4.1-4.1-1.4 1.4L12 18.8Z" />
												</svg>
											</button>
										</div>
									</div>
								</article>
								);
							})}
						</div>
					) : null}
				</>
			) : null}
		</div>
	);
}
