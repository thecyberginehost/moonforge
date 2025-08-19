import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const SubtleDisclaimer = () => {
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80 py-2">
      <AlertTriangle className="w-3 h-3" />
      <span>Not Financial Advice • </span>
      <Link 
        to="/disclaimer" 
        className="text-primary/80 hover:text-primary underline"
      >
        Read full disclaimer
      </Link>
    </div>
  );
};

export default SubtleDisclaimer;