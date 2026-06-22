import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const DISCLAIMER_CONSENT_KEY = "personachat-disclaimer-consent";

export function DisclaimerDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if user has already seen the disclaimer
    const hasConsent = localStorage.getItem(DISCLAIMER_CONSENT_KEY);
    if (!hasConsent) {
      setOpen(true);
    }
  }, []);

  const acceptDisclaimer = () => {
    localStorage.setItem(DISCLAIMER_CONSENT_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Disclaimer</DialogTitle>
          <DialogDescription>
            This is a research prototype. By using this site, you consent to the collection and analysis of your interactions for research purposes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            We may save your conversations to help improve our research. Don't worry - we're committed to handling your data responsibly.
          </p>
          <p className="text-sm text-muted-foreground">
            Have questions or concerns? Feel free to email us at <span className="font-medium">yirenl2@illinois.edu</span> for more information.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={acceptDisclaimer}>
            I understand and agree
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 