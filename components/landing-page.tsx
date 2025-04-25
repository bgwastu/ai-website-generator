import Input, { AttachmentPreview } from "@/components/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { BarChart3, Building2, Camera, Code, ExternalLink, Loader, MoreVertical, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface LandingPageProps {
  input: string;
  setInput: (v: string) => void;
  onSend: (value: string, attachments: AttachmentPreview[]) => void;
  loading: boolean;
  error: string | null;
  className?: string;
}

interface Project {
  id: string;
  domain: string;
  currentHtmlIndex: number | null;
  htmlVersions: { htmlContent: string }[];
  createdAt: string;
}

const suggestions = [
  {
    title: "Create a",
    label: "Business landing page",
    icon: <Building2 className="w-8 h-8 text-zinc-500" />,
    action: "Create a modern, professional landing page for a tech startup with hero section, feature highlights, pricing table, and testimonials. Include smooth animations and a contact form.",
  },
  {
    title: "Build a",
    label: "Crypto dashboard",
    icon: <BarChart3 className="w-8 h-8 text-zinc-500" />,
    action: "Build an interactive cryptocurrency dashboard with price charts, market trends, and real-time data. Include the latest crypto news.",
  },
  {
    title: "Design a",
    label: "Portfolio website",
    icon: <Camera className="w-8 h-8 text-zinc-500" />,
    action: "Design a stunning portfolio website for a photographer with gallery grid, image lightbox, about section, and contact form. Use subtle animations and ensure optimal image display.",
  },
  {
    title: "Generate a",
    label: "Product showcase",
    icon: <ShoppingBag className="w-8 h-8 text-zinc-500" />,
    action: "Generate a product showcase website with featured product slider, detailed specifications, comparison tables, and FAQ accordion. Make it fully responsive with a clean, modern design.",
  },
];

interface EmptyStateProps {
  setActiveTab: (tab: "create" | "projects") => void;
}

const EmptyState = ({ setActiveTab }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
      <Code className="w-10 h-10 text-zinc-500" />
    </div>
    <h2 className="text-2xl font-semibold text-zinc-900 mb-2 text-center">
      Create an AI-powered website
    </h2>
    <p className="text-zinc-600 text-center max-w-md mb-6">
      Describe your ideal website or select from our suggestions below to get started.
    </p>
    <div className="flex flex-col md:flex-row gap-4">
      <Button 
        onClick={() => {
          const createSection = document.getElementById('create-section');
          if (createSection) {
            window.scrollTo({ top: createSection.offsetTop - 100, behavior: 'smooth' });
          } else {
            setActiveTab("create");
          }
        }} 
        className="flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Create new website
      </Button>
    </div>
  </div>
);

export default function LandingPage({ input, setInput, onSend, loading, error, className }: LandingPageProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"create" | "projects">("create");
  const queryClient = useQueryClient();
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  
  // Fetch projects with pagination
  const { data, isLoading } = useQuery({
    queryKey: ["projects", page],
    queryFn: async () => {
      const res = await fetch(`/api/project?page=${page}&limit=5&sort=desc`);
      if (!res.ok) {
        throw new Error("Failed to fetch projects");
      }
      return res.json();
    },
  });
  
  const projects = data?.projects || [];
  const totalPages = data?.totalPages || 1;
  
  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/project?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete project");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeletingProjectId(null);
    },
    onError: () => {
      setDeletingProjectId(null);
      toast.error("Failed to delete project");
    }
  });
  
  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      setDeletingProjectId(id);
      deleteMutation.mutate(id);
    }
  };
  
  const handleOpenProject = (id: string) => {
    router.push(`/?id=${id}`);
  };
  
  // Function to render pagination with ellipsis
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const maxVisiblePages = 3;
    const showLeftEllipsis = page > 2;
    const showRightEllipsis = page < totalPages - 1;

    let startPage = Math.max(1, page - 1);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start if end is at limit
    if (endPage === totalPages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                if (page > 1) setPage(page - 1);
              }}
              className={cn(page <= 1 ? "pointer-events-none opacity-50" : "")}
            />
          </PaginationItem>
          
          {showLeftEllipsis && (
            <>
              <PaginationItem className="hidden sm:inline-block">
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(1);
                  }}
                >
                  1
                </PaginationLink>
              </PaginationItem>
              <PaginationItem className="hidden sm:inline-block">
                <PaginationEllipsis />
              </PaginationItem>
            </>
          )}
          
          {pages.map((p) => (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage(p);
                }}
                isActive={page === p}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          {showRightEllipsis && (
            <>
              <PaginationItem className="hidden sm:inline-block">
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem className="hidden sm:inline-block">
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(totalPages);
                  }}
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}
          
          <PaginationItem>
            <PaginationNext 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                if (page < totalPages) setPage(page + 1);
              }}
              className={cn(page >= totalPages ? "pointer-events-none opacity-50" : "")}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className={cn("min-h-screen bg-white", className)}>
      <div className="max-w-screen-md mx-auto px-5 py-14">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-zinc-900 mb-3">AI Website Generator</h1>
          <p className="text-zinc-600 text-lg">
            Create beautiful, responsive websites with AI in seconds — no coding required
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex justify-center border-b border-zinc-200 mb-8">
          <button
            onClick={() => setActiveTab("create")}
            className={cn(
              "px-8 py-3 font-medium text-sm transition-colors",
              activeTab === "create"
                ? "text-zinc-900 border-b-2 border-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Create Website
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={cn(
              "px-8 py-3 font-medium text-sm transition-colors",
              activeTab === "projects"
                ? "text-zinc-900 border-b-2 border-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Your Projects
          </button>
        </div>
        
        {activeTab === "create" ? (
          <>
            <div className="mb-7">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Create an AI-powered website</h2>
              <p className="text-zinc-600 text-sm">
                Describe your ideal website in detail or select from the templates below.
              </p>
            </div>
              
            <Input
              value={input}
              onChange={setInput}
              onSend={onSend}
              loading={loading}
              disabled={loading}
              className="mb-5"
              placeholder="Describe your dream website in detail..."
            />
              
            {error && (
              <div className="text-red-500 text-sm mb-6 p-3 bg-red-50 rounded-md border border-red-200">
                {error}
              </div>
            )}
              
            <div className="mt-10">
              <h3 className="text-md font-medium text-zinc-800 mb-4">Quick-start templates</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {suggestions.map((action, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onSend(action.action, [])}
                    className={cn(
                      "text-left border border-zinc-200 bg-white rounded-lg p-5 transition-all",
                      "hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-sm flex",
                      loading && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={loading}
                  >
                    <div className="flex gap-4 items-start">
                      <div className="shrink-0 bg-zinc-50 p-3 rounded-lg">
                        {action.icon}
                      </div>
                      <div>
                        <div className="mb-1">
                          <span className="text-zinc-400 text-xs block">
                            {action.title}
                          </span>
                          <span className="font-medium text-zinc-900">
                            {action.label}
                          </span>
                        </div>
                        <span className="text-zinc-500 text-xs line-clamp-2">
                          {action.action}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-zinc-100"></div>
                    <Loader className="w-6 h-6 text-zinc-600 animate-spin absolute inset-0 m-auto" />
                  </div>
                  <div className="font-medium text-zinc-700 mt-4">Loading your projects...</div>
                </div>
              ) : projects.length === 0 ? (
                <EmptyState setActiveTab={setActiveTab} />
              ) : (
                <>
                  {/* Mobile-responsive project cards */}
                  <div className="divide-y divide-zinc-200">
                    {projects.map((project: Project) => {
                      const isDeleting = deletingProjectId === project.id;
                      return (
                        <div
                          key={project.id}
                          className={cn(
                            "p-5 transition-all border-b border-zinc-100 relative",
                            isDeleting
                              ? "opacity-60 pointer-events-none bg-zinc-50"
                              : ""
                          )}
                        >
                          {isDeleting && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/40 backdrop-blur-[1px]">
                              <Loader className="w-5 h-5 text-zinc-600 animate-spin" />
                            </div>
                          )}
                          <div className="flex justify-between items-start">
                            <div
                              className="flex-1 min-w-0"
                              onClick={() =>
                                !isDeleting && handleOpenProject(project.id)
                              }
                              style={{
                                cursor: isDeleting ? "default" : "pointer",
                              }}
                            >
                              <div className="text-zinc-900 font-medium truncate group flex items-center">
                                {project.domain}
                                {project.currentHtmlIndex !== null && (
                                  <Badge
                                    variant="outline"
                                    className="ml-2 h-5 bg-green-50 text-green-700 border-green-200 text-[10px] font-medium"
                                  >
                                    Live
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center text-zinc-500 text-xs mt-1.5">
                                <span>
                                  Created{" "}
                                  {format(
                                    new Date(project.createdAt),
                                    "MMM d, yyyy"
                                  )}
                                </span>
                                {project.htmlVersions.length > 0 && (
                                  <>
                                    <span className="mx-2 text-zinc-300">
                                      •
                                    </span>
                                    <div className="flex items-center">
                                      <div className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-300"></span>
                                        <span>
                                          Version {project.htmlVersions.length}
                                        </span>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    disabled={isDeleting}
                                  >
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical size={16} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {project.currentHtmlIndex !== null && (
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={() => {
                                        window.open(
                                          `https://${project.domain}`,
                                          "_blank"
                                        );
                                      }}
                                    >
                                      <ExternalLink
                                        size={14}
                                        className="mr-2"
                                      />
                                      See website
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(project.id)}
                                    className="text-red-600 cursor-pointer"
                                  >
                                    <Trash2 size={14} className="mr-2" />
                                    Delete project
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Pagination section */}
                  {totalPages > 1 && (
                    <div className="p-4 border-t border-zinc-200">
                      {renderPagination()}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 