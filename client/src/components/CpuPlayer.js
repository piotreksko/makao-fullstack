import React, { PureComponent } from "react";
import Card from "./cards/Card";
import CardBack from "./cards/CardBack";
import WaitIcon from "../components/icons/WaitIcon";
import PropTypes from "prop-types";
import { CSSTransition, transit } from "react-css-transition";

class CpuPlayer extends PureComponent {
  render() {
    CSSTransition.childContextTypes = {};
    const transitionsOn = true;
    return (
      <div className={"flex-container cards-container"}>
        <div className={"row cards"}>
          {this.props.cpuPlayer.cards.map((card, index) => (
            <CSSTransition
              key={`${card.type}_${card.weight}`}
              transitionDelay={{ enter: (index + 1) * 50 }}
              transitionAppear={{ transitionsOn }}
              defaultStyle={{ transform: "translate(-100px, 200px)" }}
              enterStyle={{
                transform: transit("translate(0, 0)", 250, "ease-in-out")
              }}
              activeStyle={{ transform: "translate(0, 0)" }}
              active={transitionsOn}
            >
              <CardBack key={index} />
            </CSSTransition>
          ))}
        </div>
        <WaitIcon waitTurn={this.props.cpuPlayer.wait} playerInfo={true} />
      </div>
    );
  }
}

// For development to see CPU cards

// class CpuPlayer extends PureComponent {
//   render() {
//     CSSTransition.childContextTypes = {};
//     const transitionsOn = true;
//     return (
//       <div className={"flex-container cards-container"}>
//         <div className={"row cards"}>
//           {this.props.cpuPlayer.cards.map((card, index) => (
//             <CSSTransition
//               key={`${card.type}_${card.weight}`}
//               transitionDelay={{ enter: (index + 1) * 50 }}
//               transitionAppear={{ transitionsOn }}
//               defaultStyle={{ transform: "translate(-100px, 200px)" }}
//               enterStyle={{
//                 transform: transit("translate(0, 0)", 250, "ease-in-out")
//               }}
//               activeStyle={{ transform: "translate(0, 0)" }}
//               active={transitionsOn}
//             >
//               <Card
//                 key={index}
//                 clickOwnCard={this.props.clickOwnCard}
//                 card={card}
//                 index={index}
//                 cardClass={"cardsInHand"}
//               />
//             </CSSTransition>
//           ))}
//         </div>
//         <WaitIcon waitTurn={this.props.cpuPlayer.wait} />
//       </div>
//     );
//   }
// }

CpuPlayer.propTypes = {
  cpuPlayer: PropTypes.shape({
    cards: PropTypes.array,
    wait: PropTypes.number
  })
};

export default CpuPlayer;
