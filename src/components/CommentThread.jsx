import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	applyVoteCounts,
	buildCommentTree,
	communityKeys,
	createComment,
	deleteComment,
	fetchComments,
	getNextVote,
	voteComment,
} from '../lib/communityApi';
import CommentNode from './CommentNode.jsx';

export default function CommentThread({ definitionId, currentUserId, isLoggedIn }) {
	const queryClient = useQueryClient();
	const queryKey = communityKeys.comments(definitionId);
	const [rootText, setRootText] = useState('');
	const [commentVotes, setCommentVotes] = useState({});
	const [message, setMessage] = useState('');

	const {
		data: comments = [],
		status,
		error,
	} = useQuery({
		queryKey,
		queryFn: () => fetchComments(definitionId),
		enabled: Boolean(definitionId),
	});

	const commentsForRender = useMemo(
		() =>
			comments.map((comment) => ({
				...comment,
				userVote: Object.prototype.hasOwnProperty.call(commentVotes, comment.id)
					? commentVotes[comment.id]
					: comment.userVote,
			})),
		[comments, commentVotes],
	);

	const commentTree = useMemo(() => buildCommentTree(commentsForRender), [commentsForRender]);

	const createMutation = useMutation({
		mutationFn: createComment,
		onSuccess: () => {
			setMessage('');
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const voteMutation = useMutation({
		mutationFn: voteComment,
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey });
			const previousComments = queryClient.getQueryData(queryKey);
			const nextVote = getNextVote(variables.currentVote, variables.clickedVote);

			queryClient.setQueryData(queryKey, (oldComments = []) =>
				oldComments.map((comment) =>
					Number(comment.id) === Number(variables.commentId)
						? applyVoteCounts(comment, variables.currentVote, variables.clickedVote)
						: comment,
				),
			);
			setCommentVotes((previous) => ({
				...previous,
				[variables.commentId]: nextVote,
			}));

			return { previousComments };
		},
		onError: (mutationError, variables, context) => {
			if (context?.previousComments) {
				queryClient.setQueryData(queryKey, context.previousComments);
			}

			setCommentVotes((previous) => {
				const next = { ...previous };
				if (variables.hadLocalVote) {
					next[variables.commentId] = variables.previousLocalVote;
				} else {
					delete next[variables.commentId];
				}
				return next;
			});
			setMessage(mutationError?.message || 'No se pudo votar el comentario.');
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteComment,
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey });
			const previousComments = queryClient.getQueryData(queryKey);

			queryClient.setQueryData(queryKey, (oldComments = []) =>
				oldComments.map((comment) =>
					Number(comment.id) === Number(variables.commentId)
						? {
								...comment,
								commentText: '[Comentario eliminado]',
								status: 'DELETED',
								isDeleted: true,
							}
						: comment,
				),
			);

			return { previousComments };
		},
		onError: (mutationError, _variables, context) => {
			if (context?.previousComments) {
				queryClient.setQueryData(queryKey, context.previousComments);
			}
			setMessage(mutationError?.message || 'No se pudo eliminar el comentario.');
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	});

	async function submitRootComment(event) {
		event.preventDefault();

		if (!isLoggedIn) {
			setMessage('Debes iniciar sesión para comentar.');
			return;
		}

		const cleanText = rootText.trim();
		if (!cleanText) return;

		try {
			await createMutation.mutateAsync({
				definitionId,
				userId: currentUserId,
				commentText: cleanText,
			});
			setRootText('');
		} catch (submitError) {
			setMessage(submitError?.message || 'No se pudo publicar el comentario.');
		}
	}

	async function handleReply(parentCommentId, commentText) {
		if (!isLoggedIn) {
			const loginError = new Error('Debes iniciar sesión para responder.');
			setMessage(loginError.message);
			throw loginError;
		}

		try {
			await createMutation.mutateAsync({
				definitionId,
				userId: currentUserId,
				parentCommentId,
				commentText,
			});
		} catch (replyError) {
			setMessage(replyError?.message || 'No se pudo publicar la respuesta.');
			throw replyError;
		}
	}

	function handleVote(commentId, voteValue, currentVote) {
		if (!isLoggedIn) {
			setMessage('Debes iniciar sesión para votar.');
			return;
		}

		const nextVote = getNextVote(currentVote, voteValue);
		const hadLocalVote = Object.prototype.hasOwnProperty.call(commentVotes, commentId);
		voteMutation.mutate({
			userId: currentUserId,
			commentId,
			voteValue: nextVote,
			clickedVote: voteValue,
			currentVote,
			hadLocalVote,
			previousLocalVote: commentVotes[commentId],
		});
	}

	function handleDelete(commentId) {
		deleteMutation.mutate({
			commentId,
			userId: currentUserId,
		});
	}

	const activeVotingCommentId = voteMutation.isPending ? voteMutation.variables?.commentId : 0;
	const activeDeletingCommentId = deleteMutation.isPending ? deleteMutation.variables?.commentId : 0;
	const pendingReplyParentId = createMutation.isPending ? createMutation.variables?.parentCommentId || 0 : 0;

	return (
		<section aria-label="Comentarios" className="grid gap-5">
			<form className="grid gap-3" onSubmit={submitRootComment}>
				<textarea
					value={rootText}
					onChange={(event) => setRootText(event.target.value)}
					rows={3}
					maxLength={1000}
					disabled={!isLoggedIn || createMutation.isPending}
					placeholder={isLoggedIn ? 'Escribe un comentario...' : 'Inicia sesión para comentar'}
					className="min-h-24 resize-y rounded-2xl border border-[#d8e2f8] bg-white px-4 py-3 text-sm leading-6 text-[#111827] outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#dbeafe] disabled:cursor-not-allowed disabled:bg-[#f4f7fa] disabled:text-[#6b7280]"
				/>
				<div className="flex flex-wrap items-center gap-3">
					<button
						type="submit"
						disabled={!isLoggedIn || !rootText.trim() || createMutation.isPending}
						className="rounded-full bg-[#1d4ed8] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:bg-[#d1d5db] disabled:text-[#6b7280]"
					>
						{createMutation.isPending && !pendingReplyParentId ? 'Publicando...' : 'Comentar'}
					</button>
					{message ? <p className="m-0 text-sm font-semibold text-[#b3261e]">{message}</p> : null}
				</div>
			</form>

			{status === 'pending' ? <p className="m-0 text-sm font-semibold text-[#5f6b7a]">Cargando comentarios...</p> : null}
			{status === 'error' ? (
				<p className="m-0 text-sm font-semibold text-[#b3261e]">
					{error?.message || 'No se pudieron cargar los comentarios.'}
				</p>
			) : null}
			{status === 'success' && commentTree.length === 0 ? (
				<p className="m-0 rounded-2xl bg-[#f4f7fa] px-4 py-3 text-sm font-semibold text-[#5f6b7a]">
					Sin comentarios todavía.
				</p>
			) : null}
			{commentTree.length > 0 ? (
				<div className="grid gap-1">
					{commentTree.map((comment) => (
						<CommentNode
							key={comment.id}
							comment={comment}
							currentUserId={currentUserId}
							isLoggedIn={isLoggedIn}
							currentVote={comment.userVote}
							onVote={handleVote}
							onReply={handleReply}
							onDelete={handleDelete}
							votingCommentId={activeVotingCommentId}
							deletingCommentId={activeDeletingCommentId}
							pendingReplyParentId={pendingReplyParentId}
						/>
					))}
				</div>
			) : null}
		</section>
	);
}
