import { useEffect, useMemo, useState } from 'react';
import { apiConfig, buildApiUrl } from '../lib/api';

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
		id: pick(item, 'definition_id', 'DEFINITION_ID', 'id', 'ID'),
		word: pick(item, 'word', 'WORD'),
		definition: pick(item, 'definition', 'DEFINITION'),
		example: pick(item, 'example', 'EXAMPLE'),
		upvotes: Number(pick(item, 'upvotes', 'UPVOTES') || 0),
		downvotes: Number(pick(item, 'downvotes', 'DOWNVOTES') || 0),
		score: Number(pick(item, 'score', 'SCORE') || 0),
		author: pick(item, 'author', 'AUTHOR'),
	}));
}

export default function CommunityTrends() {
	const [trends, setTrends] = useState([]);
	const [status, setStatus] = useState('loading');
	const [message, setMessage] = useState('');

	const endpoint = useMemo(() => buildApiUrl(apiConfig.communityPath, '/trends'), []);

	useEffect(() => {
		let ignore = false;

		async function loadTrends() {
			try {
				const response = await fetch(endpoint);
				const payload = await response.json().catch(() => null);

				if (!response.ok || payload?.status === 'error') {
					throw new Error(payload?.message || 'No se pudieron cargar las tendencias.');
				}

				if (!ignore) {
					setTrends(normalizeRows(payload));
					setStatus('success');
				}
			} catch (error) {
				if (!ignore) {
					setStatus('error');
					setMessage(error.message || 'No se pudo conectar con la comunidad.');
				}
			}
		}

		loadTrends();

		return () => {
			ignore = true;
		};
	}, [endpoint]);

	if (status === 'loading') {
		return <p className="trend-state">Cargando tendencias...</p>;
	}

	if (status === 'error') {
		return <p className="trend-state trend-error">{message}</p>;
	}

	if (trends.length === 0) {
		return (
			<p className="trend-state trend-empty">
				Aun no hay tendencias publicadas. Se el primero en compartir una definicion para la
				comunidad.
			</p>
		);
	}

	return (
		<div className="trend-list">
			{trends.map((trend) => (
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
					</div>
				</article>
			))}
		</div>
	);
}
