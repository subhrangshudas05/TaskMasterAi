import Bottombar from "../components/Bottombar";

export default function TaskmasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    
    <div className="relative w-full max-w-md mx-auto min-h-dvh overflow-x-clip">
      
      {/* This is the area where your pages (Home, AI, User) render */}
      <main className="pb-0"> 
        {children}
      </main>

      <Bottombar />
      
    </div>
  );
}