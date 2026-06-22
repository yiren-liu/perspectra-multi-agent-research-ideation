import React, { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Persona } from "@/types"

import ChatTraitEditor from "@/components/dashboard/components/ChatTraitEditor"
import { useAppStore } from "@/stores/appStore"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronRight, CircleX, User2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogTitle, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function PersonaProfileDialog() {
  const { isShowingPersonaProfileDialog, setIsShowingPersonaProfileDialog, selectedPersonaId, setSelectedPersonaId, 
    handleTraitChange, getSelectedPersona, personaProfileTemplate, fullPersonaProfileTemplate } = useAppStore();
  
  const [openTraitsCollapsibles, setOpenTraitsCollapsibles] = useState<Record<string, boolean>>({});
  const isTraitsCollapsibleOpen = (path: string) =>
    openTraitsCollapsibles.hasOwnProperty(path) ? openTraitsCollapsibles[path] : true

  function renderTraits(traits: any, path: string[] = [], depth: number = 0) {
    return Object.entries(traits).map(([key, value]) => {
      const currentPath = [...path, key];
      const formattedKey = key
        .replace(/_/g, ' ')  // Replace underscores with spaces
        .replace(/([A-Z])/g, ' $1')  // Add space before capital letters (for camelCase)
        .trim()  // Trim any leading/trailing spaces
        .split(' ')  // Split into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))  // Capitalize first letter of each word
        .join(' ');  // Join back with spaces
      const pathKey = currentPath.join('.');

      if (typeof value === 'object' && value !== null) {
        const headingClass = depth === 0 ? "text-xl" : depth === 1 ? "text-lg" : "text-base";
        return (
          <Collapsible
            key={pathKey}
            open={isTraitsCollapsibleOpen(pathKey)}
            onOpenChange={(isOpen) =>
              setOpenTraitsCollapsibles((prev) => ({ ...prev, [pathKey]: isOpen }))
            }
            className={`space-y-2 ${depth > 0 ? 'mt-4' : 'mt-6'}`}
          >
            <CollapsibleTrigger className="flex items-center w-full text-left hover:bg-muted/50 p-2 rounded-md transition-colors">
              <ChevronRight className={`h-4 w-4 mr-2 transition-transform duration-200 ${isTraitsCollapsibleOpen(pathKey) ? 'rotate-90' : ''}`} />
              <h4 className={`${headingClass} font-semibold text-primary`}>{formattedKey}</h4>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className={`pl-4 ${depth > 0 ? 'border-l-2 border-muted' : ''}`}>
                {renderTraits(value, currentPath, depth + 1)}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      } else {
        return (
          <div key={pathKey} className="flex flex-col space-y-1 mt-2">
            <Label htmlFor={pathKey} className="text-sm font-medium text-muted-foreground">
              {formattedKey}
            </Label>
            <Input
              id={pathKey}
              type="text"
              value={value as string}
              onChange={(e) => handleTraitChange(currentPath, e.target.value)}
              className="max-w-md focus:ring-1 focus:ring-primary/50"
            />
          </div>
        );
      }
    });
  }

  // A utility function to create an empty traits object from a given schema template.
  function createEmptyTraitObject(template: any): any {
    if (template && typeof template === "object") {
      if (template.hasOwnProperty("value") && template.value && template.value.type) {
        switch (template.value.type) {
          case "text":
            return "";
          case "choice":
            return "";
          default:
            return "";
        }
      } else {
        const result: Record<string, any> = {};
        Object.keys(template).forEach((key) => {
          result[key] = createEmptyTraitObject(template[key]);
        });
        return result;
      }
    }
    return "";
  }

  const selectedPersona = getSelectedPersona();

  return (
    <Dialog
      open={isShowingPersonaProfileDialog}
      onOpenChange={setIsShowingPersonaProfileDialog}
    >
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {selectedPersona ? (
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage src={selectedPersona.avatar} alt={selectedPersona.name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedPersona.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <User2 className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <DialogTitle className="text-xl">
                  {selectedPersona ? selectedPersona.name : "New Persona"}
                </DialogTitle>
                {selectedPersona && (
                  <Badge variant="outline" className="mt-1 text-xs bg-primary/5">
                    Expert Profile
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Separator />
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="flex flex-col flex-grow pb-4">
            <div className="rounded-md overflow-hidden">
              {selectedPersona ? (
                <>{renderTraits(selectedPersona.personaDescription)}</>
              ) : (
                <>{renderTraits(createEmptyTraitObject(personaProfileTemplate))}</>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between mt-4 gap-2">
          <Button
            variant="outline"
            onClick={() => setIsShowingPersonaProfileDialog(false)}
          >
            Cancel
          </Button>
          {selectedPersona ? (
            <Button onClick={() => setIsShowingPersonaProfileDialog(false)}>
              Save Changes
            </Button>
          ) : (
            <Button onClick={() => setIsShowingPersonaProfileDialog(false)}>
              Create Persona
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

