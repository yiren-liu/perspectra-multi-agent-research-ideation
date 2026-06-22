import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea"
import { useChatStore } from '@/stores/chatStore';
import { PersonaTraitEdit } from '@/types';

import { useApi } from '@/controller/API';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';


export default function ChatTraitEditor({ onClose=() => {} }: { onClose: () => void }) {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedChanges, setSuggestedChanges] = useState<PersonaTraitEdit>({});
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());

  const { updateSelectedPersonaWithEdits, getSelectedPersona } = useChatStore();
  const { toast } = useToast();
  const { getPersonaDescEdits } = useApi();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) {
      toast({
        variant: "destructive",
        title: "Please enter an instruction",
        description: "You need to provide an instruction for the trait edits",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await getPersonaDescEdits(instruction, getSelectedPersona()!);
      setSuggestedChanges(response.data);
    } catch (error) {
      console.error("Error fetching persona edits:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeSelection = (key: string) => {
    setSelectedChanges(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const applyChanges = () => {
    const selectedEdits = Object.fromEntries(
      Object.entries(suggestedChanges).filter(([key]) => selectedChanges.has(key))
    );
    updateSelectedPersonaWithEdits(selectedEdits);

    // reset the state
    setInstruction('');
    setSuggestedChanges({});
    setSelectedChanges(new Set());
  };

  function applyIndividualChange(key: string) {
    const changeToApply = { [key]: suggestedChanges[key] };
    updateSelectedPersonaWithEdits(changeToApply);

    // Remove the applied change from the suggested changes
    setSuggestedChanges(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });

    // Remove from selected changes if it was selected
    setSelectedChanges(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  }

  function dismissChange(key: string) {
    // Remove the dismissed change from the suggested changes
    setSuggestedChanges(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });

    // Remove from selected changes if it was selected
    setSelectedChanges(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  }

  return (
    <div className="flex flex-col flex-grow">
      <form onSubmit={handleSubmit} className="space-y-2 pb-4 border-b border-dashed">
        <Label htmlFor="llm-instruction">Describe the Expert You are Looking for: </Label>
        <Textarea
          className="h-24"
          id="llm-instruction"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="I want an expert who has expertise in learning science and technology..."
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Get Expert Trait Suggestions'}
          </Button>
        </div>
      </form>

      {Object.keys(suggestedChanges).length === 0 && (
        <div className="flex flex-grow items-center justify-center border-dashed border rounded-md mt-4">
          <div className="text-xl text-muted-foreground text-center">
            Submit to see suggested traits
          </div>
        </div>
      )}

      {Object. keys(suggestedChanges).length > 0 && (
        <ScrollArea className="h-[300px] border rounded-md p-4 mt-4">
          <h3 className="text-lg font-semibold mb-2">Suggested Changes</h3>
          {Object.entries(suggestedChanges).map(([key, change]) => (
            <>
              <div key={key} className="flex items-center justify-between space-x-2 py-2">
                <Label htmlFor={`change-${key}`} className="max-w-md">
                  <span className="font-medium">{key}:</span> 
                  <br />
                  <span className="text-muted-foreground">{change.old_value} → {change.new_value}</span>
                </Label>
                <div className="flex space-x-2">
                  <Button className="h-6" onClick={() => applyIndividualChange(key)}>Apply</Button>
                  <Button className="h-6" variant="outline" onClick={() => dismissChange(key)}>Dismiss</Button>
                </div>
              </div>
            </>
          ))}
        </ScrollArea>
      )}

    </div>
  );
}

