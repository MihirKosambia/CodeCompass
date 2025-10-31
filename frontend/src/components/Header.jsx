import terminalIcon from "@/assets/icons/terminal.svg";

export default function Header() {
  return (
    <header className="border-b-2 border-white bg-black text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={terminalIcon} alt="" className="h-5 w-5 invert" />
          <h1 className="font-pixel text-base tracking-wider md:text-lg">GitHub Repo Chat</h1>
        </div>
      </div>
    </header>
  );
}
