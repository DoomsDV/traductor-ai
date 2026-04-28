import { apiConfig, buildApiUrl } from './api';

export const communityKeys = {
	trends: ['community', 'trends'],
	myDefinitions: (userId) => ['community', 'my-definitions', Number(userId || 0)],
	comments: (definitionId) => ['community', 'comments', Number(definitionId || 0)],
};

function communityUrl(resource) {
	return buildApiUrl(apiConfig.communityPath, resource);
}

export function pick(source, ...keys) {
	for (const key of keys) {
		if (source?.[key] !== undefined && source[key] !== null) return source[key];
	}

	return undefined;
}

function asRows(payload) {
	const data = payload?.data ?? payload?.items ?? payload?.rows ?? payload;
	if (Array.isArray(data)) return data;
	if (Array.isArray(data?.items)) return data.items;
	return [];
}

function toNumber(value, fallback = 0) {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}

function toOptionalNumber(value) {
	if (value === undefined || value === null || value === '') return null;

	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function toText(value) {
	return value === undefined || value === null ? '' : String(value);
}

export function formatDateDDMMYY(value) {
	if (!value) return '';

	const raw = String(value).trim();
	const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);

	if (dmy) {
		return `${dmy[1].padStart(2, '0')}-${dmy[2].padStart(2, '0')}-${dmy[3].slice(-2)}`;
	}

	const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
	if (iso) {
		return `${iso[3].padStart(2, '0')}-${iso[2].padStart(2, '0')}-${iso[1].slice(-2)}`;
	}

	const parsed = new Date(raw);
	if (!Number.isNaN(parsed.getTime())) {
		return `${String(parsed.getDate()).padStart(2, '0')}-${String(parsed.getMonth() + 1).padStart(
			2,
			'0',
		)}-${String(parsed.getFullYear()).slice(-2)}`;
	}

	return raw.replace(/\//g, '-');
}

async function requestJson(url, options = {}, fallbackMessage = 'No se pudo completar la solicitud.') {
	const response = await fetch(url, options);
	const rawBody = await response.text();
	let payload = null;

	if (rawBody) {
		try {
			payload = JSON.parse(rawBody);
		} catch {
			payload = { message: rawBody };
		}
	}

	if (!response.ok || payload?.status === 'error') {
		const message = payload?.message || payload?.error || fallbackMessage;
		throw new Error(`HTTP ${response.status}: ${message}`);
	}

	return payload || {};
}

export function normalizeDefinition(item) {
	const upvotes = toNumber(pick(item, 'upvotes', 'UPVOTES'));
	const downvotes = toNumber(pick(item, 'downvotes', 'DOWNVOTES'));
	const explicitScore = pick(item, 'score', 'SCORE');
	const dateValue = pick(item, 'date_formatted', 'DATE_FORMATTED', 'created_at', 'CREATED_AT');
	const id = toNumber(pick(item, 'definition_id', 'DEFINITION_ID', 'id', 'ID'));

	return {
		id,
		definitionId: id,
		word: toText(pick(item, 'word', 'WORD', 'word_text', 'WORD_TEXT')),
		definition: toText(pick(item, 'definition', 'DEFINITION', 'definition_text', 'DEFINITION_TEXT')),
		example: toText(pick(item, 'example', 'EXAMPLE', 'context_example', 'CONTEXT_EXAMPLE')),
		upvotes,
		downvotes,
		score: explicitScore === undefined ? upvotes - downvotes : toNumber(explicitScore),
		author: toText(pick(item, 'author', 'AUTHOR', 'display_name', 'DISPLAY_NAME')),
		authorId: toOptionalNumber(
			pick(item, 'author_id', 'AUTHOR_ID', 'author_user_id', 'AUTHOR_USER_ID', 'user_id', 'USER_ID'),
		),
		profilePicUrl: toText(pick(item, 'profile_pic_url', 'PROFILE_PIC_URL')),
		dateFormatted: formatDateDDMMYY(dateValue),
		userVote: toNumber(pick(item, 'user_vote', 'USER_VOTE', 'vote_value', 'VOTE_VALUE')),
		status: toText(pick(item, 'status', 'STATUS') || 'ACTIVE'),
	};
}

export function normalizeComment(item) {
	const upvotes = toNumber(pick(item, 'upvotes', 'UPVOTES'));
	const downvotes = toNumber(pick(item, 'downvotes', 'DOWNVOTES'));
	const explicitScore = pick(item, 'score', 'SCORE');
	const status = toText(pick(item, 'status', 'STATUS') || 'ACTIVE').toUpperCase();
	const text = toText(pick(item, 'comment_text', 'COMMENT_TEXT', 'text', 'TEXT'));
	const id = toNumber(pick(item, 'comment_id', 'COMMENT_ID', 'id', 'ID'));
	const parentCommentId = toOptionalNumber(
		pick(item, 'parent_comment_id', 'PARENT_COMMENT_ID', 'parent_id', 'PARENT_ID'),
	);
	const visibleText = status === 'DELETED' && !text ? '[Comentario eliminado]' : text;

	return {
		id,
		commentId: id,
		parentCommentId,
		commentText: visibleText,
		upvotes,
		downvotes,
		score: explicitScore === undefined ? upvotes - downvotes : toNumber(explicitScore),
		status,
		dateFormatted: formatDateDDMMYY(pick(item, 'date_formatted', 'DATE_FORMATTED', 'created_at', 'CREATED_AT')),
		author: toText(pick(item, 'author', 'AUTHOR', 'display_name', 'DISPLAY_NAME')),
		authorId: toOptionalNumber(pick(item, 'author_id', 'AUTHOR_ID', 'user_id', 'USER_ID')),
		profilePicUrl: toText(pick(item, 'profile_pic_url', 'PROFILE_PIC_URL')),
		userVote: toNumber(pick(item, 'user_vote', 'USER_VOTE', 'vote_value', 'VOTE_VALUE')),
		isDeleted: status === 'DELETED' || visibleText.trim() === '[Comentario eliminado]',
	};
}

export function buildCommentTree(flatComments = []) {
	const nodesById = new Map();
	const roots = [];

	for (const comment of flatComments) {
		const id = toOptionalNumber(pick(comment, 'id', 'commentId', 'comment_id', 'COMMENT_ID'));
		if (!id) continue;

		nodesById.set(id, {
			...comment,
			id,
			commentId: id,
			parentCommentId: toOptionalNumber(
				pick(comment, 'parentCommentId', 'parent_comment_id', 'PARENT_COMMENT_ID', 'parent_id', 'PARENT_ID'),
			),
			replies: [],
		});
	}

	for (const comment of flatComments) {
		const id = toOptionalNumber(pick(comment, 'id', 'commentId', 'comment_id', 'COMMENT_ID'));
		const node = nodesById.get(id);
		if (!node) continue;

		if (node.parentCommentId && node.parentCommentId !== node.id && nodesById.has(node.parentCommentId)) {
			nodesById.get(node.parentCommentId).replies.push(node);
			continue;
		}

		roots.push(node);
	}

	return roots;
}

export function getNextVote(currentVote, requestedVote) {
	return Number(currentVote || 0) === Number(requestedVote) ? 0 : Number(requestedVote);
}

export function applyVoteCounts(item, currentVote, requestedVote) {
	const nextVote = getNextVote(currentVote, requestedVote);
	const previousVote = Number(currentVote || 0);
	const upvotes = Math.max(0, Number(item.upvotes || 0) + (nextVote === 1 ? 1 : 0) - (previousVote === 1 ? 1 : 0));
	const downvotes = Math.max(
		0,
		Number(item.downvotes || 0) + (nextVote === -1 ? 1 : 0) - (previousVote === -1 ? 1 : 0),
	);

	return {
		...item,
		upvotes,
		downvotes,
		score: upvotes - downvotes,
		userVote: nextVote,
	};
}

export async function fetchTrends() {
	const payload = await requestJson(communityUrl('/trends'), undefined, 'No se pudieron cargar las tendencias.');
	return asRows(payload).map(normalizeDefinition);
}

export async function fetchMyDefinitions(userId) {
	const payload = await requestJson(
		communityUrl(`/mis-definiciones/${userId}`),
		undefined,
		'No se pudieron cargar tus definiciones.',
	);
	return asRows(payload).map(normalizeDefinition);
}

export async function createDefinition({ userId, wordText, definitionText, contextExample }) {
	return requestJson(
		communityUrl('/definitions'),
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				user_id: userId,
				word_text: wordText,
				definition_text: definitionText,
				context_example: contextExample || '',
			}),
		},
		'No se pudo crear la definicion.',
	);
}

export async function updateDefinition({ definitionId, userId, definitionText, contextExample }) {
	return requestJson(
		communityUrl(`/definitions/${definitionId}`),
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				definition_id: definitionId,
				user_id: userId,
				definition_text: definitionText,
				context_example: contextExample || '',
			}),
		},
		'No se pudo actualizar la definicion.',
	);
}

export async function deleteDefinition({ definitionId, userId }) {
	return requestJson(
		communityUrl('/definitions'),
		{
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				definition_id: definitionId,
				user_id: userId,
			}),
		},
		'No se pudo eliminar la definicion.',
	);
}

export async function voteDefinition({ userId, definitionId, voteValue }) {
	return requestJson(
		communityUrl('/votes'),
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				user_id: userId,
				definition_id: definitionId,
				vote_value: voteValue,
			}),
		},
		'No se pudo registrar el voto.',
	);
}

export async function fetchComments(definitionId) {
	const payload = await requestJson(
		communityUrl(`/comments/${definitionId}`),
		undefined,
		'No se pudieron cargar los comentarios.',
	);
	return asRows(payload).map(normalizeComment);
}

export async function createComment({ definitionId, userId, parentCommentId, commentText }) {
	const body = {
		definition_id: definitionId,
		user_id: userId,
		comment_text: commentText,
	};

	if (parentCommentId) {
		body.parent_comment_id = parentCommentId;
	}

	return requestJson(
		communityUrl('/comments'),
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		},
		'No se pudo publicar el comentario.',
	);
}

export async function voteComment({ userId, commentId, voteValue }) {
	return requestJson(
		communityUrl('/comments/votes'),
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				user_id: userId,
				comment_id: commentId,
				vote_value: voteValue,
			}),
		},
		'No se pudo votar el comentario.',
	);
}

export async function deleteComment({ commentId, userId }) {
	return requestJson(
		communityUrl('/comments'),
		{
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				comment_id: commentId,
				user_id: userId,
			}),
		},
		'No se pudo eliminar el comentario.',
	);
}
