import React from "react";
import PropTypes from 'prop-types';

export default function ModalButton({ onClick, text, image, ...props }) {
    
  const buttonStyle = image && {
    backgroundImage:
      "url(" + require(`../../content/images/${image}.png`) + ")",
    backgroundSize: "40px",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center"
  };

  return (
    <button onClick={onClick} className="modal-button" style={buttonStyle}>
      {text}
    </button>
  );
}

ModalButton.propTypes={
    text: PropTypes.string,
    image: PropTypes.string,
    onClick: PropTypes.func,
}
