import { useState } from 'react';
import ConfirmModal from './ConfirmModal.jsx';

function ArrowIcon({ direction }) {
	const isUp = direction === 'up';

	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
			{isUp ? (
				<path d="M12 5.2 5.5 11.7l1.4 1.4 4.1-4.1V19h2V9l4.1 4.1 1.4-1.4L12 5.2Z" />
			) : (
				<path d="M12 18.8 18.5 12.3l-1.4-1.4-4.1 4.1V5h-2v10l-4.1-4.1-1.4 1.4L12 18.8Z" />
			)}
		</svg>
	);
}

function ReplyIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
			<path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-.8-5-3.7-10.5-11-11Z" />
		</svg>
	);
}

function TrashIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
			<path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" />
		</svg>
	);
}

function avatarInitial(author) {
	const clean = String(author || 'C').trim();
	return clean ? clean[0].toUpperCase() : 'C';
}

function SmallVoteButton({ direction, selected, disabled, onClick }) {
	const isUp = direction === 'up';
	const label = isUp ? 'Votar comentario a favor' : 'Votar comentario en contra';
	const selectedClasses = isUp
		? 'bg-[#1d4ed8] text-white'
		: 'bg-[#b3261e] text-white';

	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			disabled={disabled}
			onClick={onClick}
			className={`grid h-7 w-7 place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${
				selected ? selectedClasses : 'text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
			}`}
		>
			<ArrowIcon direction={direction} />
		</button>
	);
}

export default function CommentNode({
	comment,
	currentUserId,
	isLoggedIn,
	currentVote,
	onVote,
	onReply,
	onDelete,
	votingCommentId = 0,
	deletingCommentId = 0,
	pendingReplyParentId = 0,
	depth = 0,
}) {
	const [replying, setReplying] = useState(false);
	const [replyText, setReplyText] = useState('');
	const [replyError, setReplyError] = useState('');
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);

	const isDeleted = Boolean(comment.isDeleted || comment.commentText?.trim() === '[Comentario eliminado]');
	const isAuthor = Boolean(currentUserId && comment.authorId && Number(currentUserId) === Number(comment.authorId));
	const isVoting = Number(votingCommentId) === Number(comment.id);
	const isDeleting = Number(deletingCommentId) === Number(comment.id);
	const isReplyPending = Number(pendingReplyParentId) === Number(comment.id);
	const canAct = Boolean(isLoggedIn && !isDeleted);
	const replies = Array.isArray(comment.replies) ? comment.replies : [];

	async function submitReply(event) {
		event.preventDefault();
		const cleanText = replyText.trim();
		if (!cleanText) return;

		try {
			setReplyError('');
			await onReply(comment.id, cleanText);
			setReplyText('');
			setReplying(false);
		} catch (error) {
			setReplyError(error?.message || 'No se pudo publicar la respuesta.');
		}
	}

	function requestDelete() {
		setDeleteModalOpen(true);
	}

	function confirmDelete() {
		setDeleteModalOpen(false);
		onDelete(comment.id);
	}

	return (
		<div className={depth > 0 ? 'border-l border-[#d8e2f8] pl-4 sm:pl-5' : ''}>
			<article className="py-3">
				<header className="flex min-w-0 items-center gap-3">
					{comment.profilePicUrl && !isDeleted ? (
						<img
							src={comment.profilePicUrl}
							alt=""
							className="h-8 w-8 shrink-0 rounded-full object-cover"
							referrerPolicy="no-referrer"
						/>
					) : (
						<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#dbeafe] text-sm font-bold text-[#1e3a8a]">
							{isDeleted ? '-' : avatarInitial(comment.author)}
						</span>
					)}
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
							<strong className="text-sm leading-5 text-[#111827]">{isDeleted ? 'Comentario eliminado' : comment.author || 'Comunidad'}</strong>
							{comment.dateFormatted ? <span className="text-xs font-semibold text-[#6b7280]">{comment.dateFormatted}</span> : null}
						</div>
						<span className="text-xs font-bold text-[#5f6b7a]">{comment.score} pts</span>
					</div>
				</header>

				<p className={`mt-2 text-sm leading-6 ${isDeleted ? 'italic text-[#6b7280]' : 'text-[#1f2937]'}`}>
					{isDeleted ? '[Comentario eliminado]' : comment.commentText || 'Sin comentario'}
				</p>

				{!isDeleted ? (
					<footer className="mt-3 flex flex-wrap items-center gap-3">
						<div className="inline-flex items-center gap-1 rounded-full bg-[#f1f5f9] p-0.5">
							<SmallVoteButton
								direction="up"
								selected={Number(currentVote) === 1}
								disabled={!canAct || isVoting}
								onClick={() => onVote(comment.id, 1, currentVote)}
							/>
							<span className="min-w-[32px] text-center text-xs font-bold text-[#475569]">
								{comment.upvotes} / {comment.downvotes}
							</span>
							<SmallVoteButton
								direction="down"
								selected={Number(currentVote) === -1}
								disabled={!canAct || isVoting}
								onClick={() => onVote(comment.id, -1, currentVote)}
							/>
						</div>
						<button
							type="button"
							disabled={!canAct}
							className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-[#1d4ed8] transition hover:bg-[#eef5ff] disabled:cursor-not-allowed disabled:opacity-40"
							onClick={() => setReplying((value) => !value)}
						>
							<ReplyIcon />
							Responder
						</button>
						{isAuthor ? (
							<button
								type="button"
								disabled={isDeleting}
								className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-[#b3261e] transition hover:bg-[#fceeee] disabled:cursor-not-allowed disabled:opacity-40"
								onClick={requestDelete}
							>
								<TrashIcon />
								Eliminar
							</button>
						) : null}
					</footer>
				) : null}

				{replying && !isDeleted ? (
					<form className="mt-3 grid gap-2" onSubmit={submitReply}>
						<textarea
							value={replyText}
							onChange={(event) => setReplyText(event.target.value)}
							rows={2}
							maxLength={1000}
							placeholder="Responder..."
							className="min-h-20 resize-y rounded-2xl border border-[#d8e2f8] bg-white px-4 py-3 text-sm leading-6 text-[#111827] outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#dbeafe]"
						/>
						<div className="flex flex-wrap items-center gap-2">
							<button
								type="submit"
								disabled={!replyText.trim() || isReplyPending}
								className="rounded-full bg-[#1d4ed8] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:bg-[#d1d5db] disabled:text-[#6b7280]"
							>
								{isReplyPending ? 'Publicando...' : 'Publicar'}
							</button>
							<button
								type="button"
								className="rounded-full px-4 py-2 text-xs font-bold text-[#1d4ed8] transition hover:bg-[#eef5ff]"
								onClick={() => setReplying(false)}
							>
								Cancelar
							</button>
						</div>
						{replyError ? <p className="m-0 text-xs font-semibold text-[#b3261e]">{replyError}</p> : null}
					</form>
				) : null}
			</article>

			{replies.length > 0 ? (
				<div className="grid gap-1">
					{replies.map((reply) => (
						<CommentNode
							key={reply.id}
							comment={reply}
							currentUserId={currentUserId}
							isLoggedIn={isLoggedIn}
							currentVote={reply.userVote}
							onVote={onVote}
							onReply={onReply}
							onDelete={onDelete}
							votingCommentId={votingCommentId}
							deletingCommentId={deletingCommentId}
							pendingReplyParentId={pendingReplyParentId}
							depth={depth + 1}
						/>
					))}
				</div>
			) : null}

			<ConfirmModal
				isOpen={deleteModalOpen}
				title="Eliminar comentario"
				message="¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer."
				confirmText="Eliminar"
				cancelText="Cancelar"
				isDestructive={true}
				onConfirm={confirmDelete}
				onCancel={() => setDeleteModalOpen(false)}
			/>
		</div>
	);
}
