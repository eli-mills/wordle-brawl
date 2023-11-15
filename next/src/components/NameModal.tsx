import { useState, useContext, FormEvent, useEffect } from "react";
import { GlobalContext } from "@/pages/_app";
import { GameEvents } from "../../../common";

type NameModalArgs = {
  setDisplayModal: (_: boolean) => void;
};

export default function NameModal({ setDisplayModal }: NameModalArgs) {
  const [playerName, setName] = useState("");
  const [showDuplicateNameMsg, setShowDuplicateNameMsg] = useState(false);
  const { socket } = useContext(GlobalContext);

  const onButtonClick = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    socket?.emit(GameEvents.DECLARE_NAME, playerName, (result) => {
      if (result.accepted) {
        setDisplayModal(false);
      } else {
          result.duplicate && setShowDuplicateNameMsg(true);
      }
    });
    return false;
  };

  return (
    <div className="nameModalBackground">
      <form className="nameModal" onSubmit={onButtonClick}>
        <input
          type="text"
          onChange={(e) => {
            setName(e.target.value);
            setShowDuplicateNameMsg(false);
          }}
          onKeyUp={(e) => e.stopPropagation()}
        />
        {showDuplicateNameMsg && <p color="red"> Name is already in use </p>}
        <button className="submitName" type="submit">
          Submit
        </button>
      </form>
    </div>
  );
}
