import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmModal({
	isOpen,
	title,
	message,
	onConfirm,
	onCancel,
	confirmText = 'Confirmar',
	cancelText = 'Cancelar',
	isDestructive = false,
}) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [isOpen]);

	if (!isOpen || !mounted) return null;

	const handleOverlayClick = (e) => {
		if (e.target === e.currentTarget) {
			onCancel();
		}
	};

	return createPortal(
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f172a]/40 p-4 backdrop-blur-sm"
			onClick={handleOverlayClick}
			role="dialog"
			aria-modal="true"
			aria-labelledby="confirm-modal-title"
			aria-describedby="confirm-modal-desc"
		>
			<div className="w-full max-w-[400px] scale-100 transform overflow-hidden rounded-[28px] bg-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.12)] sm:p-8">
				<h2 id="confirm-modal-title" className="m-0 text-2xl font-bold tracking-tight text-[#111827]">
					{title}
				</h2>
				<p id="confirm-modal-desc" className="mt-4 text-base leading-relaxed text-[#4b5563]">
					{message}
				</p>

				<div className="mt-8 flex flex-wrap items-center justify-end gap-2">
					<button
						type="button"
						className="rounded-full px-5 py-2.5 text-sm font-bold text-[#4b5563] transition hover:bg-[#f3f4f6] hover:text-[#111827]"
						onClick={onCancel}
					>
						{cancelText}
					</button>
					<button
						type="button"
						className={`rounded-full px-5 py-2.5 text-sm font-bold text-white transition ${
							isDestructive
								? 'bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#991b1b]'
								: 'bg-[#1d4ed8] hover:bg-[#1e40af] active:bg-[#1e3a8a]'
						}`}
						onClick={onConfirm}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>,
		document.body
	);
}
