import { useState, useContext, FormEvent } from "react";
import { GlobalContext } from "@/pages/_app";
import { GameEvents } from "../../../common";

type NameModalArgs = {
  setDisplayModal: (_: boolean) => void;
};

export default function NameModal({ setDisplayModal }: NameModalArgs) {
  const [playerName, setName] = useState("");
  const { socket } = useContext(GlobalContext);

  const onButtonClick = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    socket?.emit(GameEvents.DECLARE_NAME, playerName);
    setDisplayModal(false);
    return false;
  };

  return (
    <div className="nameModalBackground">
      <form className="nameModal" onSubmit={onButtonClick}>
        <input
          type="text"
          onChange={(e) => setName(e.target.value)}
          onKeyUp={(e) => e.stopPropagation()}
        />
        <button className="submitName" type="submit" >
          Submit
        </button>
      </form>
    </div>
  );
}
