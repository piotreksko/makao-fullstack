const buttonImages = import.meta.glob<string>("../../content/images/**/*.png", {
  eager: true,
  import: "default"
});

interface ModalButtonProps {
  onClick?: () => void;
  text?: string;
  image?: string;
}

export default function ModalButton({ onClick, text, image }: ModalButtonProps) {

  const buttonStyle = image
    ? {
        backgroundImage:
          "url(" + buttonImages[`../../content/images/${image}.png`] + ")",
        backgroundSize: "40px",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center"
      }
    : undefined;

  return (
    <button onClick={onClick} className="modal-button" style={buttonStyle}>
      {text}
    </button>
  );
}
