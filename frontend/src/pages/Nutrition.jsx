import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Utensils, Brain } from "lucide-react";
import CalorieTrackerPanel from "@/pages/CalorieTrackerPanel";
import MealPlanPanel from "@/pages/MealPlanPanel";

// Merged page (item 7): Calorie Tracker + Meal Plan → "Nutrition"
export default function Nutrition() {
  return (
    <div data-testid="nutrition-page" className="space-y-6">
      <div>
        <div className="text-xs text-accent uppercase tracking-widest">Nutrition</div>
        <h1 className="display text-4xl sm:text-5xl">Nutrition</h1>
        <p className="text-sm text-muted-foreground mt-1">Track what you eat and drink, and generate your AI meal plan — all in one place.</p>
      </div>

      <Tabs defaultValue="tracker" className="w-full">
        <TabsList className="rounded-full" data-testid="nutrition-tabs">
          <TabsTrigger value="tracker" className="rounded-full" data-testid="tab-tracker"><Utensils className="w-4 h-4 mr-1.5"/>Calorie Tracker</TabsTrigger>
          <TabsTrigger value="mealplan" className="rounded-full" data-testid="tab-mealplan"><Brain className="w-4 h-4 mr-1.5"/>AI Meal Plan</TabsTrigger>
        </TabsList>
        <TabsContent value="tracker" className="mt-5"><CalorieTrackerPanel /></TabsContent>
        <TabsContent value="mealplan" className="mt-5"><MealPlanPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
