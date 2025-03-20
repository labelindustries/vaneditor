"use client";

import { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import Image from "next/image";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Trash2,
  RotateCcw,
  Info,
  Move,
  Maximize,
  Zap,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Base image and stickers
const BASE_IMAGE = "/stickers/base.png";
const STICKERS = [
  "/stickers/sticker2.svg",
  "/stickers/sticker3.svg",
  "/stickers/sticker4.svg",
  "/stickers/sticker5.svg",
  "/stickers/sticker6.svg",
  "/stickers/sticker7.svg",
  "/stickers/sticker8.svg",
  "/stickers/sticker9.svg",
  "/stickers/sticker10.svg",
  "/stickers/sticker11.svg",
  "/stickers/sticker12.svg",
  "/stickers/sticker13.svg",
  "/stickers/sticker14.svg",
  "/stickers/sticker15.svg",
  "/stickers/sticker16.svg",
];

// Extend the Canvas type to include our custom property
declare module "fabric/fabric-impl" {
  interface Canvas {
    backgroundObject?: fabric.Image;
  }
}

export default function VanEditor() {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const [activeTab, setActiveTab] = useState("stickers");
  const [selectedSticker, setSelectedSticker] = useState<boolean>(false);

  // Ensure activeTab is never "stickers" since we removed that tab
  useEffect(() => {
    if (activeTab === "stickers") {
      setActiveTab("edit");
    }
  }, [activeTab]);

  const [filters, setFilters] = useState<{
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
  }>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
  });

  // Pre-process image to ensure it can handle filters properly
  const processImage = (imageUrl: string, maxSize = 2048): Promise<string> => {
    // Ensure all dependencies are specified
    return new Promise((resolve) => {
      // Create image element properly
      const image = document.createElement("img");
      image.src = imageUrl;
      image.crossOrigin = "anonymous"; // Handle CORS if needed

      image.onload = () => {
        // Create an off-screen canvas
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        let newWidth = image.width;
        let newHeight = image.height;

        // Scale the image if needed
        if (Math.max(image.width, image.height) > maxSize) {
          if (image.height >= image.width) {
            newHeight = maxSize;
            newWidth = (maxSize / image.height) * image.width;
          } else {
            newWidth = maxSize;
            newHeight = (maxSize / image.width) * image.height;
          }
        }

        // Set canvas size
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw the image onto the canvas
        context?.drawImage(image, 0, 0, newWidth, newHeight);

        // Convert to data URL and resolve
        resolve(canvas.toDataURL("image/png"));
      };

      // Handle errors
      image.onerror = () => {
        console.error("Error loading image");
        resolve(imageUrl); // Fallback to original URL
      };
    });
  };

  // Initialize canvas
  useEffect(() => {
    const initCanvas = async () => {
      // Create canvas
      const canvas = new fabric.Canvas("van-canvas", {
        width: 1200,
        height: 960,
        backgroundColor: "#f5f5f5",
      });

      try {
        // Pre-process the base image
        const processedImageUrl = await processImage(BASE_IMAGE);

        // Load the processed image
        fabric.Image.fromURL(processedImageUrl, (img) => {
          // Scale image to fit canvas
          const scale = Math.min(
            canvas.width! / img.width!,
            canvas.height! / img.height!
          );

          img.set({
            scaleX: scale,
            scaleY: scale,
            originX: "center",
            originY: "center",
            left: canvas.width! / 2,
            top: canvas.height! / 2,
            selectable: false,
            evented: false,
          });

          // Add as a regular object but store reference
          canvas.add(img);
          // Use a proper type-safe approach instead of custom property
          canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
          canvas.sendToBack(img);
          canvas.renderAll();
        });
      } catch (error) {
        console.error("Error initializing canvas:", error);
      }

      // Update selection status when objects are selected/deselected
      canvas.on("selection:created", () => setSelectedSticker(true));
      canvas.on("selection:updated", () => setSelectedSticker(true));
      canvas.on("selection:cleared", () => setSelectedSticker(false));

      canvasRef.current = canvas;
    };

    initCanvas();

    // Add keyboard event listener for deleting objects
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canvasRef.current) return;

      // Check if Delete or Backspace key is pressed
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeObject = canvasRef.current.getActiveObject();

        // Make sure we're not deleting the background image
        if (
          activeObject &&
          activeObject !== canvasRef.current.backgroundObject
        ) {
          canvasRef.current.remove(activeObject);
          canvasRef.current.renderAll();
          setSelectedSticker(false);
        }
      }
    };

    // Add event listener
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup on unmount
    return () => {
      if (canvasRef.current) {
        canvasRef.current.dispose();
        canvasRef.current = null;
      }
      // Remove event listener
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Apply filters when values change
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    // Use type assertion or find the background image from canvas objects
    const bgImage = canvas
      .getObjects()
      .find((obj) => obj instanceof fabric.Image) as fabric.Image;
    if (!bgImage) return;

    // Reset filters
    bgImage.filters = [];

    // Add active filters
    bgImage.filters.push(
      new fabric.Image.filters.Brightness({ brightness: filters.brightness }),
      new fabric.Image.filters.Contrast({ contrast: filters.contrast }),
      new fabric.Image.filters.Saturation({ saturation: filters.saturation }),
      new fabric.Image.filters.HueRotation({ rotation: filters.hue })
    );

    // Apply filters
    bgImage.applyFilters();
    canvas.renderAll();
  }, [filters]);

  // Add sticker to canvas
  const addSticker = (stickerUrl: string) => {
    if (!canvasRef.current) return;

    fabric.loadSVGFromURL(stickerUrl, (objects, options) => {
      // For SVG files, use loadSVGFromURL instead of Image.fromURL
      const svgGroup = fabric.util.groupSVGElements(objects, options);

      // Set initial size and position
      const canvasWidth = canvasRef.current?.width || 1200;
      const canvasHeight = canvasRef.current?.height || 960;

      // Scale SVG to reasonable size (100px width)
      const scaleFactor = 100 / svgGroup.width!;

      svgGroup.set({
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        scaleX: scaleFactor,
        scaleY: scaleFactor,
        cornerSize: 10,
        cornerColor: "white",
        cornerStrokeColor: "#aaa",
        borderColor: "#aaa",
        transparentCorners: false,
        originX: "center",
        originY: "center",
      });

      canvasRef.current?.add(svgGroup);
      canvasRef.current?.setActiveObject(svgGroup);
      canvasRef.current?.renderAll();
      setSelectedSticker(true);

      // Switch to the edit tab after adding a sticker
      setActiveTab("edit");
    });
  };

  // Handle filter changes
  const handleFilterChange = (type: keyof typeof filters, value: number[]) => {
    setFilters((prev) => ({ ...prev, [type]: value[0] }));
  };

  // Reset filters and update slider positions
  const resetFilters = () => {
    setFilters({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
    });
  };

  // Download the customized image
  const downloadImage = () => {
    if (!canvasRef.current) return;

    const dataURL = canvasRef.current.toDataURL({
      format: "png",
      quality: 1,
    });

    const link = document.createElement("a");
    link.download = "my-custom-van.png";
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add a function to delete the currently selected sticker
  const deleteSelectedSticker = () => {
    if (!canvasRef.current) return;

    const activeObject = canvasRef.current.getActiveObject();

    // Make sure we're not deleting the background image
    if (activeObject && activeObject !== canvasRef.current.backgroundObject) {
      canvasRef.current.remove(activeObject);
      canvasRef.current.renderAll();
      setSelectedSticker(false);
    }
  };

  // Send the selected sticker to the back (just above the background)
  const sendStickerToBack = () => {
    if (!canvasRef.current) return;

    const activeObject = canvasRef.current.getActiveObject();

    if (activeObject && activeObject !== canvasRef.current.backgroundObject) {
      // Send to back (but keep above the background image)
      canvasRef.current.sendToBack(activeObject);

      // Find the background image and bring it to the very back
      const bgImage = canvasRef.current
        .getObjects()
        .find((obj) => obj instanceof fabric.Image) as fabric.Image;

      if (bgImage) {
        canvasRef.current.sendToBack(bgImage);
      }

      canvasRef.current.renderAll();
    }
  };

  return (
    <div className="flex flex-col items-center p-4 md:p-6 mx-auto bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen">
      <div className="w-full">
        <div className="flex flex-col gap-6">
          {/* Canvas area */}
          <div className="space-y-4 mx-auto">
            <Card className="overflow-hidden border-2 border-slate-200">
              <CardContent className="p-0">
                <div className="relative">
                  <canvas id="van-canvas" className="w-full" />

                  {/* Canvas overlay with instructions when empty */}
                  {!selectedSticker && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/60 text-white p-4 rounded-lg text-center max-w-xs">
                        <Zap className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">
                          Click on a sticker from the panel below to add it to
                          your van
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={downloadImage}
                      className="flex-1 bg-primary hover:bg-primary/90"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Design
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save your custom van as a PNG image</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {selectedSticker && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={deleteSelectedSticker}
                        variant="destructive"
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Sticker
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete the currently selected sticker</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mx-auto">
            {/* Stickers section - now below the image */}
            <Card className="h-[25rem]">
              <CardHeader className="pb-3">
                <CardTitle>Stickers</CardTitle>
                <p className="text-sm text-slate-500">
                  Click on a sticker to add it to your van
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 md:grid-cols-8 gap-2">
                  {STICKERS.map((sticker, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="p-1 h-auto aspect-square hover:bg-slate-100 hover:border-primary/50 bg-[#b9b9b9]"
                      onClick={() => addSticker(sticker)}
                    >
                      <Image
                        src={sticker || "/placeholder.svg"}
                        alt={`Sticker ${index + 1}`}
                        width={50}
                        height={50}
                        className="object-fill"
                      />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Controls area - now only contains Edit and Filters tabs */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Customization Tools</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Tabs
                    value={activeTab === "stickers" ? "edit" : activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="grid grid-cols-2 mb-2 mx-4">
                      <TabsTrigger value="edit">Edit</TabsTrigger>
                      <TabsTrigger value="filters">Filters</TabsTrigger>
                    </TabsList>

                    <TabsContent value="edit" className="px-4 pb-4 space-y-4">
                      {selectedSticker ? (
                        <div className="space-y-4">
                          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                            <div className="flex items-start">
                              <Info className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-amber-800">
                                <p className="font-medium mb-1">
                                  Sticker Controls:
                                </p>
                                <ul className="space-y-1 list-inside list-disc">
                                  <li className="flex items-center">
                                    <Move className="h-3.5 w-3.5 mr-1 text-amber-600" />{" "}
                                    Drag to position
                                  </li>
                                  <li className="flex items-center">
                                    <Maximize className="h-3.5 w-3.5 mr-1 text-amber-600" />{" "}
                                    Use corners to resize/rotate
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>

                          <Button
                            onClick={deleteSelectedSticker}
                            variant="destructive"
                            className="w-full"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Selected Sticker
                          </Button>

                          <Button
                            onClick={sendStickerToBack}
                            variant="outline"
                            className="w-full mt-2"
                          >
                            <Move className="h-4 w-4 mr-2" />
                            Move Sticker to Bottom
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <div className="bg-slate-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-3">
                            <Info className="h-8 w-8 text-slate-400" />
                          </div>
                          <p className="font-medium">No Sticker Selected</p>
                          <p className="text-sm mt-1">
                            Select a sticker on the canvas to edit it, or add a
                            new one from the Stickers section below
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="filters" className="px-4 pb-4">
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label htmlFor="brightness">Brightness</Label>
                            <span className="text-xs text-slate-500">
                              {filters.brightness.toFixed(2)}
                            </span>
                          </div>
                          <Slider
                            id="brightness"
                            value={[filters.brightness]}
                            min={-1}
                            max={1}
                            step={0.05}
                            onValueChange={(value) =>
                              handleFilterChange("brightness", value)
                            }
                            className="py-1"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label htmlFor="contrast">Contrast</Label>
                            <span className="text-xs text-slate-500">
                              {filters.contrast.toFixed(2)}
                            </span>
                          </div>
                          <Slider
                            id="contrast"
                            value={[filters.contrast]}
                            min={-1}
                            max={1}
                            step={0.05}
                            onValueChange={(value) =>
                              handleFilterChange("contrast", value)
                            }
                            className="py-1"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label htmlFor="saturation">Saturation</Label>
                            <span className="text-xs text-slate-500">
                              {filters.saturation.toFixed(2)}
                            </span>
                          </div>
                          <Slider
                            id="saturation"
                            value={[filters.saturation]}
                            min={-1}
                            max={1}
                            step={0.05}
                            onValueChange={(value) =>
                              handleFilterChange("saturation", value)
                            }
                            className="py-1"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label htmlFor="hue">Hue Rotation</Label>
                            <span className="text-xs text-slate-500">
                              {filters.hue}°
                            </span>
                          </div>
                          <Slider
                            id="hue"
                            value={[filters.hue]}
                            min={0}
                            max={360}
                            step={5}
                            onValueChange={(value) =>
                              handleFilterChange("hue", value)
                            }
                            className="py-1"
                          />
                        </div>

                        <Button
                          variant="outline"
                          className="w-full mt-4"
                          onClick={resetFilters}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset All Filters
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">How to Use</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="text-sm space-y-2 list-decimal pl-5 text-slate-700">
                    <li>Select stickers from the Stickers section below</li>
                    <li>Position and resize stickers on your van</li>
                    <li>Adjust colors and effects in the Filters tab</li>
                    <li>Download your creation when finished</li>
                  </ol>
                  <Separator className="my-3" />
                  <p className="text-xs text-slate-500">
                    Tip: Press Delete key or use the Remove button to delete
                    selected stickers
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
