"use client";

type ModalProps = {
    isOpen: boolean;   
    onClose: () => void;
    children: React.ReactNode;
}

export function PopupModal({isOpen, onClose, children}: ModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] min-h-screen"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-[320px] border border-gray-100 dark:border-white/[0.07] shadow-xl shadow-black/20 dark:shadow-black/60
                ring-1 ring-black/5 dark:ring-white/[0.04]"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: "modalIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
                {children}
            </div>
        </div>
    )
}