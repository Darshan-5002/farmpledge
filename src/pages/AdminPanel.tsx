import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "@/hooks/useWeb3";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Wallet, 
  Send, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Copy,
  ExternalLink,
  Shield,
  TrendingUp,
  Clock,
  Download,
  AlertCircle,
  Package,
  Plus,
  Edit,
  Trash2,
  IndianRupee,
  FileSearch,
  Check,
  X,
  Upload,
  Image as ImageIcon,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { storage as appwriteStorage, ID } from "@/lib/appwrite";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { isAddress } from "ethers";
import { db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc as firestoreDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";

interface PaymentRecord {
  id: string;
  recipient: string;
  amount: string;
  currency: string;
  txHash: string;
  status: "pending" | "success" | "failed";
  timestamp: Date;
}

type FarmerApplicationStatus = "pending" | "approved" | "rejected";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  image?: string; // Legacy single image support
  images?: string[]; // Multiple images array
  expiryDate?: string | null; // Optional expiry date (ISO string or null)
}

interface FarmerApplicationRow {
  id: string;
  farmName: string;
  registrationNumber?: string;
  governmentId?: string;
  status: FarmerApplicationStatus;
  submittedAt?: Date | null;
  farmerEmail?: string | null;
  certificationLinks?: string;
  additionalNotes?: string;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const { role, verificationStatus, user } = useAuth();
  const { 
    isConnected, 
    account, 
    balance, 
    isLoading, 
    chainId,
    connectWallet, 
    disconnectWallet, 
    sendPayment,
    isMetaMaskInstalled
  } = useWeb3();

  const [recipientAddress, setRecipientAddress] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<"ETH" | "MATIC">("ETH");
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  
  // Product Listing State
  const [products, setProducts] = useState<Product[]>([
    {
      id: "1",
      name: "Fresh Organic Milk (1L)",
      description: "Pure, organic milk from grass-fed cows. Delivered fresh daily.",
      price: 50,
      category: "Dairy",
      inStock: true,
    },
    {
      id: "2",
      name: "Farm Fresh Butter (500g)",
      description: "Hand-churned butter made from premium cream.",
      price: 120,
      category: "Dairy",
      inStock: true,
    },
  ]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Dairy",
    inStock: true,
    images: [] as File[],
    imageUrls: [] as string[], // Preview URLs
    uploadedImageUrls: [] as string[], // Already uploaded URLs (for editing)
    expiryDate: "" as string,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [applications, setApplications] = useState<FarmerApplicationRow[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [processingApplicationId, setProcessingApplicationId] = useState<string | null>(null);

  const handleSendPayment = async () => {
    if (!recipientAddress || !paymentAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!isAddress(recipientAddress)) {
      toast.error("Invalid recipient address");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Add to history as pending
    const pendingPayment: PaymentRecord = {
      id: Date.now().toString(),
      recipient: recipientAddress,
      amount: paymentAmount,
      currency: selectedCurrency,
      txHash: "",
      status: "pending",
      timestamp: new Date(),
    };
    setPaymentHistory((prev) => [pendingPayment, ...prev]);

    const result = await sendPayment(recipientAddress, paymentAmount, selectedCurrency);

    // Update payment record
    if (result.success && result.txHash) {
      setPaymentHistory((prev) =>
        prev.map((payment) =>
          payment.id === pendingPayment.id
            ? { ...payment, status: "success", txHash: result.txHash! }
            : payment
        )
      );
      setRecipientAddress("");
      setPaymentAmount("");
    } else {
      setPaymentHistory((prev) =>
        prev.map((payment) =>
          payment.id === pendingPayment.id ? { ...payment, status: "failed" } : payment
        )
      );
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getExplorerUrl = (txHash: string) => {
    if (!chainId) return "#";
    // Ethereum Mainnet
    if (chainId === 1) return `https://etherscan.io/tx/${txHash}`;
    // Polygon
    if (chainId === 137) return `https://polygonscan.com/tx/${txHash}`;
    // Sepolia Testnet
    if (chainId === 11155111) return `https://sepolia.etherscan.io/tx/${txHash}`;
    // Mumbai Testnet
    if (chainId === 80001) return `https://mumbai.polygonscan.com/tx/${txHash}`;
    // Default to Etherscan
    return `https://etherscan.io/tx/${txHash}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Product Management Functions
  const handleAddProduct = async () => {
    if (!productForm.name || !productForm.description || !productForm.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Upload new images if any
    let uploadedUrls: string[] = [];
    if (productForm.images.length > 0) {
      console.log("Starting upload of", productForm.images.length, "images");
      try {
        uploadedUrls = await handleMultipleImageUpload(productForm.images);
        console.log("Upload complete. Got", uploadedUrls.length, "URLs");
        // Allow product creation even if some images fail (but warn user)
        if (uploadedUrls.length === 0 && productForm.images.length > 0) {
          const proceed = confirm("No images were uploaded. Do you want to continue without images?");
          if (!proceed) {
            setUploadingImage(false);
            return;
          }
        }
      } catch (error) {
        console.error("Image upload failed:", error);
        toast.error("Image upload failed. You can still save the product without images.");
        setUploadingImage(false);
        // Continue with product creation even if upload fails
      } finally {
        // Ensure state is reset
        setUploadingImage(false);
      }
    }

    // Combine uploaded images with existing ones (for editing)
    const allImageUrls = [...productForm.uploadedImageUrls, ...uploadedUrls];

    const newProduct: any = {
      name: productForm.name,
      description: productForm.description,
      price: parseFloat(productForm.price),
      category: productForm.category,
      inStock: productForm.inStock,
      ownerId: user?.uid ?? null,
      ownerName: user?.displayName ?? user?.email ?? "Farmer",
      createdAt: serverTimestamp(),
    };

    // Add images array if available
    if (allImageUrls.length > 0) {
      newProduct.images = allImageUrls;
      // Also set first image as legacy 'image' field for backward compatibility
      newProduct.image = allImageUrls[0];
    }

    // Add expiry date if provided
    if (productForm.expiryDate) {
      newProduct.expiryDate = productForm.expiryDate;
    }

    // Persist to Firestore if available
    if (db) {
      addDoc(collection(db, "products"), newProduct)
        .then(() => {
          toast.success("Product added successfully");
        })
        .catch((err) => {
          console.error("Failed to add product", err);
          toast.error("Failed to add product");
        })
        .finally(() => {
          setProductForm({ 
            name: "", 
            description: "", 
            price: "", 
            category: "Dairy", 
            inStock: true,
            images: [],
            imageUrls: [],
            uploadedImageUrls: [],
            expiryDate: "",
          });
          setIsAddingProduct(false);
        });
    } else {
      // Dev fallback: local state only
      const temp: Product = {
        id: Date.now().toString(),
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        category: newProduct.category,
        inStock: newProduct.inStock,
        images: allImageUrls.length > 0 ? allImageUrls : undefined,
        image: allImageUrls.length > 0 ? allImageUrls[0] : undefined,
        expiryDate: productForm.expiryDate || undefined,
      };
      setProducts([...products, temp]);
      setProductForm({ 
        name: "", 
        description: "", 
        price: "", 
        category: "Dairy", 
        inStock: true,
        images: [],
        imageUrls: [],
        uploadedImageUrls: [],
        expiryDate: "",
      });
      setIsAddingProduct(false);
      toast.success("Product added (dev mode)");
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    // Use images array if available, otherwise fall back to single image
    const existingImages = product.images || (product.image ? [product.image] : []);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      inStock: product.inStock,
      images: [],
      imageUrls: [],
      uploadedImageUrls: existingImages,
      expiryDate: product.expiryDate || "",
    });
    setIsAddingProduct(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !productForm.name || !productForm.description || !productForm.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Upload new images if any
    let uploadedUrls: string[] = [];
    if (productForm.images.length > 0) {
      console.log("Starting upload of", productForm.images.length, "images for update");
      try {
        uploadedUrls = await handleMultipleImageUpload(productForm.images);
        console.log("Upload complete. Got", uploadedUrls.length, "URLs");
        // Allow product update even if some images fail (but warn user)
        if (uploadedUrls.length === 0 && productForm.images.length > 0) {
          const proceed = confirm("No new images were uploaded. Do you want to continue with existing images only?");
          if (!proceed) {
            setUploadingImage(false);
            return;
          }
        }
      } catch (error) {
        console.error("Image upload failed:", error);
        toast.error("Image upload failed. You can still update the product with existing images.");
        setUploadingImage(false);
        // Continue with product update even if upload fails
      } finally {
        // Ensure state is reset
        setUploadingImage(false);
      }
    }

    // Combine existing uploaded images with newly uploaded ones
    const allImageUrls = [...productForm.uploadedImageUrls, ...uploadedUrls];

    const updateData: any = {
      name: productForm.name,
      description: productForm.description,
      price: parseFloat(productForm.price),
      category: productForm.category,
      inStock: productForm.inStock,
      updatedAt: serverTimestamp(),
    };

    // Update images array
    updateData.images = allImageUrls.length > 0 ? allImageUrls : [];
    // Also update legacy image field for backward compatibility
    updateData.image = allImageUrls.length > 0 ? allImageUrls[0] : null;

    // Update expiry date
    updateData.expiryDate = productForm.expiryDate || null;

    if (db && editingProduct?.id) {
      updateDoc(firestoreDoc(db, "products", editingProduct.id), updateData)
        .then(() => {
          toast.success("Product updated successfully");
        })
        .catch((err) => {
          console.error("Failed to update product", err);
          toast.error("Failed to update product");
        })
        .finally(() => {
          setEditingProduct(null);
          setProductForm({ 
            name: "", 
            description: "", 
            price: "", 
            category: "Dairy", 
            inStock: true,
            images: [],
            imageUrls: [],
            uploadedImageUrls: [],
            expiryDate: "",
          });
          setIsAddingProduct(false);
        });
    } else {
      setProducts(
        products.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: productForm.name,
                description: productForm.description,
                price: parseFloat(productForm.price),
                category: productForm.category,
                inStock: productForm.inStock,
                images: allImageUrls.length > 0 ? allImageUrls : undefined,
                image: allImageUrls.length > 0 ? allImageUrls[0] : undefined,
                expiryDate: productForm.expiryDate || undefined,
              }
            : p
        )
      );
      setEditingProduct(null);
      setProductForm({ 
        name: "", 
        description: "", 
        price: "", 
        category: "Dairy", 
        inStock: true,
        images: [],
        imageUrls: [],
        uploadedImageUrls: [],
        expiryDate: "",
      });
      setIsAddingProduct(false);
      toast.success("Product updated (dev mode)");
    }
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      if (db) {
        deleteDoc(firestoreDoc(db, "products", id))
          .then(() => toast.success("Product deleted"))
          .catch((err) => {
            console.error("Failed to delete product", err);
            toast.error("Failed to delete product");
          });
      } else {
        setProducts(products.filter((p) => p.id !== id));
        toast.success("Product deleted (dev mode)");
      }
    }
  };

  const cancelProductForm = () => {
    // Force reset upload state
    setUploadingImage(false);
    setIsAddingProduct(false);
    setEditingProduct(null);
    setProductForm({ 
      name: "", 
      description: "", 
      price: "", 
      category: "Dairy", 
      inStock: true,
      images: [],
      imageUrls: [],
      uploadedImageUrls: [],
      expiryDate: "",
    });
  };

  // Force reset upload state (emergency function)
  const forceResetUpload = () => {
    setUploadingImage(false);
    toast.info("Upload state reset");
  };

  // Handle image upload (single file) using Appwrite
  const handleImageUpload = async (file: File): Promise<string | null> => {
    if (!appwriteStorage || !user) {
      console.error("Appwrite Storage or user not available", { hasStorage: !!appwriteStorage, hasUser: !!user });
      toast.error("Please log in to upload images");
      return null;
    }

    if (!user.uid) {
      console.error("User not authenticated");
      toast.error("Authentication required. Please log in again.");
      return null;
    }

    try {
      // Clean filename to avoid issues
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileId = ID.unique();
      const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;
      
      if (!bucketId) {
        toast.error("Appwrite bucket not configured. Please set VITE_APPWRITE_BUCKET_ID");
        return null;
      }
      
      console.log("Starting upload for:", file.name, "Size:", file.size, "User:", user.uid);
      
      // Upload file to Appwrite Storage
      // Pass empty array to inherit bucket permissions (bucket already configured with read:any, write:users)
      const uploadedFile = await appwriteStorage.createFile(
        bucketId,
        fileId,
        file,
        [] // Empty array inherits bucket permissions
      );
      
      console.log("Upload complete, getting URL for:", file.name);
      
      // Get file view URL (public URL for full-size image)
      // Use getFileView for full-size or getFilePreview for resized versions
      const fileUrl = appwriteStorage.getFileView(bucketId, uploadedFile.$id);
      
      console.log("Got download URL for:", file.name);
      return fileUrl.toString();
    } catch (error: any) {
      console.error("Image upload error for", file.name, ":", error);
      
      // Provide specific error messages
      if (error.code === 401 || error.message?.includes('unauthorized')) {
        toast.error("Upload unauthorized. Please check Appwrite permissions.");
      } else if (error.code === 413 || error.message?.includes('size')) {
        toast.error("File too large. Maximum size is 5MB.");
      } else if (error.code === 400) {
        toast.error("Invalid file. Please check file format.");
      } else {
        toast.error(`Upload failed: ${error.message || error.code || 'Unknown error'}`);
      }
      
      return null;
    }
  };

  // Handle multiple image uploads using Appwrite
  const handleMultipleImageUpload = async (files: File[]): Promise<string[]> => {
    // Reset state first to ensure clean start
    setUploadingImage(false);
    
    if (!appwriteStorage || !user) {
      toast.error("Storage not available. Please configure Appwrite.");
      return [];
    }

    if (files.length === 0) {
      return [];
    }

    setUploadingImage(true);
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      // Create timeout promise (60 seconds for Appwrite)
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Upload timeout after 60 seconds"));
        }, 60000);
      });

      // Upload all files in parallel
      const uploadPromises = files.map((file) => handleImageUpload(file));
      
      // Race between uploads and timeout
      const urls = await Promise.race([
        Promise.all(uploadPromises),
        timeoutPromise,
      ]) as (string | null)[];
      
      // Clear timeout if upload succeeded
      if (timeoutId) clearTimeout(timeoutId);
      
      const successfulUrls = urls.filter((url): url is string => url !== null);
      
      if (successfulUrls.length < files.length) {
        toast.warning(`${successfulUrls.length} of ${files.length} images uploaded successfully`);
      }
      
      return successfulUrls;
    } catch (error: any) {
      // Clear timeout on error
      if (timeoutId) clearTimeout(timeoutId);
      
      console.error("Multiple image upload error:", error);
      if (error.message?.includes("timeout")) {
        toast.error("Upload timed out. Please try again with fewer or smaller images.");
      } else {
        toast.error("Failed to upload images: " + (error.message || "Unknown error"));
      }
      return [];
    } finally {
      // Always reset state
      setUploadingImage(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate all files
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        invalidFiles.push(`${file.name} is not an image`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        invalidFiles.push(`${file.name} exceeds 5MB`);
        return;
      }
      validFiles.push(file);
    });

    if (invalidFiles.length > 0) {
      toast.error(`Some files were invalid: ${invalidFiles.join(", ")}`);
    }

    if (validFiles.length === 0) return;

    // Limit to 10 images total
    const currentCount = productForm.images.length + productForm.uploadedImageUrls.length;
    if (currentCount + validFiles.length > 10) {
      toast.error("Maximum 10 images allowed per product");
      const allowed = 10 - currentCount;
      validFiles.splice(allowed);
    }

    // Create preview URLs
    const previewPromises = validFiles.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previewPromises).then((previewUrls) => {
      setProductForm({
        ...productForm,
        images: [...productForm.images, ...validFiles],
        imageUrls: [...productForm.imageUrls, ...previewUrls],
      });
    });

    // Reset input
    e.target.value = "";
  };

  const removeImage = (index: number, isUploaded: boolean = false) => {
    if (isUploaded) {
      setProductForm({
        ...productForm,
        uploadedImageUrls: productForm.uploadedImageUrls.filter((_, i) => i !== index),
      });
    } else {
      setProductForm({
        ...productForm,
        images: productForm.images.filter((_, i) => i !== index),
        imageUrls: productForm.imageUrls.filter((_, i) => i !== index),
      });
    }
  };

  useEffect(() => {
    if (!db || role !== "admin") {
      setApplications([]);
      return;
    }

    setApplicationsLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "farmerApplications"),
      (snapshot) => {
        const rows: FarmerApplicationRow[] = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          const submittedAt =
            data.submittedAt && typeof data.submittedAt.toDate === "function"
              ? data.submittedAt.toDate()
              : null;
          return {
            id: docSnapshot.id,
            farmName: data.farmName ?? "—",
            registrationNumber: data.registrationNumber ?? "",
            governmentId: data.governmentId ?? "",
            status: (data.status as FarmerApplicationStatus) ?? "pending",
            submittedAt,
            farmerEmail: data.farmerEmail ?? null,
            certificationLinks: data.certificationLinks ?? "",
            additionalNotes: data.additionalNotes ?? "",
          };
        });

        setApplications(rows);
        setApplicationsLoading(false);
      },
      (error) => {
        console.error("Failed to load farmer applications", error);
        toast.error("Failed to load farmer applications.");
        setApplicationsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [role]);

  const handleApplicationStatusChange = async (applicationId: string, newStatus: FarmerApplicationStatus) => {
    if (!db) {
      toast.error("Firebase is not configured. Unable to update application.");
      return;
    }

    try {
      setProcessingApplicationId(applicationId);
      const applicationRef = firestoreDoc(db, "farmerApplications", applicationId);
      await updateDoc(applicationRef, {
        status: newStatus,
        reviewedAt: serverTimestamp(),
        reviewerId: user?.uid ?? null,
      });
      await updateDoc(firestoreDoc(db, "users", applicationId), {
        verificationStatus: newStatus,
      });

      toast.success(
        newStatus === "approved"
          ? "Farmer application approved successfully."
          : "Farmer application marked for further review.",
      );
    } catch (error) {
      console.error("Failed to update application status", error);
      toast.error("Failed to update application status. Please try again.");
    } finally {
      setProcessingApplicationId(null);
    }
  };

  const defaultTab = role === "admin" ? "applications" : "products";

  if (role === "farmer" && verificationStatus !== "approved") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <Card className="shadow-lg">
            <CardHeader className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Farmer verification required</CardTitle>
              <CardDescription>
                {verificationStatus === "pending"
                  ? "Your application is under review. Once approved, the farmer dashboard will be unlocked automatically."
                  : verificationStatus === "rejected"
                    ? "We need additional information to complete your verification. Please update and resubmit your application."
                    : "Complete your verification to access blockchain payments and product management tools."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground flex items-start gap-3">
                <FileSearch className="h-4 w-4 text-primary mt-1" />
                <div>
                  Our onboarding specialists validate every farm partner to ensure quality and traceability. Keep an eye
                  on your email for status updates.
                </div>
              </div>
              <div className="grid gap-3">
                <Button size="lg" onClick={() => navigate("/farmer/verification")}>
                  {verificationStatus === "pending" ? "View submitted application" : "Complete verification"}
                </Button>
                <Button variant="ghost" onClick={() => navigate("/products")}>
                  Browse marketplace
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Subscribe to products for listing management
  useEffect(() => {
    if (!db) return;
    try {
      const base = collection(db, "products");
      const q =
        role === "farmer" && user?.uid
          ? query(base, where("ownerId", "==", user.uid), orderBy("name"))
          : query(base, orderBy("name"));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const items: Product[] = snapshot.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              name: data.name ?? "",
              description: data.description ?? "",
              price: Number(data.price) ?? 0,
              category: data.category ?? "Dairy",
              inStock: Boolean(data.inStock),
              image: data.image ?? undefined,
              expiryDate: data.expiryDate ?? null,
            };
          });
          setProducts(items);
        },
        (error) => {
          console.error("Failed to load products", error);
        },
      );
      return () => unsub();
    } catch (err) {
      console.error("Products subscription error", err);
    }
  }, [role, user?.uid]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">
              {role === "farmer" ? "Farmer Dashboard" : "Admin Panel"}
            </span>
            <Badge variant="secondary">Blockchain Payments</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => window.location.href = "/products"}>
              Products
            </Button>
            {isConnected ? (
              <Button variant="outline" onClick={disconnectWallet}>
                Disconnect Wallet
              </Button>
            ) : (
              <Button onClick={connectWallet} disabled={!isMetaMaskInstalled || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect Wallet
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {!isMetaMaskInstalled && (
          <Card className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-amber-500/10 p-2">
                  <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                      MetaMask Not Installed
                    </h3>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                      To use blockchain payments, you need to install the MetaMask browser extension.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => window.open("https://metamask.io/download/", "_blank")}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Install MetaMask
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.location.reload();
                      }}
                      className="border-amber-600 text-amber-700 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-300"
                    >
                      Reload After Installation
                    </Button>
                  </div>
                  <div className="mt-4 p-3 bg-white dark:bg-gray-900 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-2">
                      Quick Steps:
                    </p>
                    <ol className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-decimal list-inside">
                      <li>Click "Install MetaMask" above</li>
                      <li>Choose your browser (Chrome, Firefox, Edge, or Brave)</li>
                      <li>Install the extension</li>
                      <li>Create or import a wallet</li>
                      <li>Refresh this page</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          {/* Wallet Status Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet Status</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isConnected ? (
                  <Badge variant="default" className="text-sm">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-sm">
                    <XCircle className="mr-1 h-3 w-3" />
                    Not Connected
                  </Badge>
                )}
              </div>
              {account && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Address:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs">{formatAddress(account)}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(account)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Balance:</span>
                    <span className="font-semibold">{parseFloat(balance).toFixed(4)} ETH</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Payments Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {paymentHistory.filter((p) => p.status === "success").length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Successful transactions
              </p>
            </CardContent>
          </Card>

          {/* Total Volume Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {paymentHistory
                  .filter((p) => p.status === "success")
                  .reduce((sum, p) => sum + parseFloat(p.amount), 0)
                  .toFixed(4)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">ETH sent</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="flex flex-wrap gap-2">
            {role === "admin" && (
              <TabsTrigger value="applications">
                <FileSearch className="mr-2 h-4 w-4" />
                Farmer Applications
              </TabsTrigger>
            )}
            <TabsTrigger value="products">
              <Package className="mr-2 h-4 w-4" />
              Product Listing
            </TabsTrigger>
            <TabsTrigger value="payments">
              <Wallet className="mr-2 h-4 w-4" />
              Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Product Listing</CardTitle>
                    <CardDescription>Manage your product inventory</CardDescription>
                  </div>
                  {!isAddingProduct && (
                    <Button onClick={() => setIsAddingProduct(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isAddingProduct ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-name">Product Name *</Label>
                      <Input
                        id="product-name"
                        placeholder="e.g., Fresh Organic Milk (1L)"
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-description">Description *</Label>
                      <Input
                        id="product-description"
                        placeholder="Product description"
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="product-price">Price (₹) *</Label>
                        <Input
                          id="product-price"
                          type="number"
                          placeholder="0"
                          value={productForm.price}
                          onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="product-category">Category</Label>
                        <select
                          id="product-category"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={productForm.category}
                          onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                        >
                          <option value="Dairy">Dairy</option>
                          <option value="Cheese">Cheese</option>
                          <option value="Butter">Butter</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-images">
                        Product Images <span className="text-muted-foreground text-xs">(Up to 10 images)</span>
                      </Label>
                      
                      {/* Existing uploaded images (when editing) */}
                      {productForm.uploadedImageUrls.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {productForm.uploadedImageUrls.map((url, index) => (
                            <div key={`uploaded-${index}`} className="relative group">
                              <div className="w-full aspect-square border rounded-lg overflow-hidden">
                                <img
                                  src={url}
                                  alt={`Uploaded ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeImage(index, true)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* New image previews */}
                      {productForm.imageUrls.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {productForm.imageUrls.map((url, index) => (
                            <div key={`preview-${index}`} className="relative group">
                              <div className="w-full aspect-square border rounded-lg overflow-hidden">
                                <img
                                  src={url}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeImage(index, false)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <Input
                          id="product-images"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageChange}
                          disabled={uploadingImage || (productForm.images.length + productForm.uploadedImageUrls.length >= 10)}
                          className="cursor-pointer"
                        />
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted-foreground">
                            {uploadingImage 
                              ? "Uploading images... Please wait" 
                              : `Max 5MB per image. ${productForm.images.length + productForm.uploadedImageUrls.length}/10 images selected`}
                          </p>
                          {uploadingImage && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={forceResetUpload}
                              className="h-6 text-xs"
                            >
                              Cancel Upload
                            </Button>
                          )}
                        </div>
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                          <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">ℹ️ Using Appwrite Storage</p>
                          <p className="text-blue-700 dark:text-blue-300">
                            Images are stored in Appwrite. No CORS configuration needed! 
                            See <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">APPWRITE_SETUP.md</code> for setup instructions.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiry-date">
                        Expiry Date <span className="text-muted-foreground text-xs">(Optional)</span>
                      </Label>
                      <Input
                        id="expiry-date"
                        type="date"
                        value={productForm.expiryDate}
                        onChange={(e) => setProductForm({ ...productForm, expiryDate: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="in-stock"
                        checked={productForm.inStock}
                        onChange={(e) => setProductForm({ ...productForm, inStock: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="in-stock" className="cursor-pointer">
                        In Stock
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
                        className="flex-1"
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading images... ({productForm.images.length} files)
                          </>
                        ) : editingProduct ? (
                          "Update Product"
                        ) : (
                          "Add Product"
                        )}
                      </Button>
                      <Button variant="outline" onClick={cancelProductForm} disabled={uploadingImage}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {products.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No products yet. Click "Add Product" to get started.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Image</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Expiry Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                {product.image ? (
                                  <div className="w-16 h-16 rounded overflow-hidden border">
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-16 h-16 rounded border flex items-center justify-center bg-muted">
                                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="max-w-xs truncate">{product.description}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{product.category}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <IndianRupee className="h-4 w-4" />
                                  {product.price}
                                </div>
                              </TableCell>
                              <TableCell>
                                {product.expiryDate ? (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    {new Date(product.expiryDate).toLocaleDateString()}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {product.inStock ? (
                                  <Badge variant="default">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    In Stock
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    <XCircle className="mr-1 h-3 w-3" />
                                    Out of Stock
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditProduct(product)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteProduct(product.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Tabs defaultValue="send" className="space-y-4">
              <TabsList>
                <TabsTrigger value="send">
                  <Send className="mr-2 h-4 w-4" />
                  Send Payment
                </TabsTrigger>
                <TabsTrigger value="history">
                  <Clock className="mr-2 h-4 w-4" />
                  Payment History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="send" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Blockchain Payment</CardTitle>
                <CardDescription>
                  Send cryptocurrency payments directly from your connected wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isConnected ? (
                  <div className="text-center py-8">
                    <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      Connect your wallet to send payments
                    </p>
                    <Button onClick={connectWallet} disabled={!isMetaMaskInstalled}>
                      <Wallet className="mr-2 h-4 w-4" />
                      Connect Wallet
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="recipient">Recipient Address</Label>
                      <Input
                        id="recipient"
                        placeholder="0x..."
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.0001"
                          placeholder="0.0"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <select
                          id="currency"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={selectedCurrency}
                          onChange={(e) => setSelectedCurrency(e.target.value as "ETH" | "MATIC")}
                        >
                          <option value="ETH">ETH</option>
                          <option value="MATIC">MATIC</option>
                        </select>
                      </div>
                    </div>

                    <Separator />

                    <Button
                      onClick={handleSendPayment}
                      disabled={isLoading || !recipientAddress || !paymentAmount}
                      className="w-full"
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Payment
                        </>
                      )}
                    </Button>

                    {account && (
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Your Balance:</p>
                        <p className="text-lg font-semibold">
                          {parseFloat(balance).toFixed(4)} ETH
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>View all blockchain payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No payment history yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Transaction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentHistory.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {payment.status === "success" ? (
                              <Badge variant="default">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Success
                              </Badge>
                            ) : payment.status === "pending" ? (
                              <Badge variant="secondary">
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Pending
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="mr-1 h-3 w-3" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">{formatAddress(payment.recipient)}</code>
                          </TableCell>
                          <TableCell>
                            {payment.amount} {payment.currency}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(payment.timestamp, { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            {payment.txHash ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  window.open(
                                    getExplorerUrl(payment.txHash),
                                    "_blank"
                                  )
                                }
                              >
                                <ExternalLink className="mr-1 h-3 w-3" />
                                View
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {role === "admin" && (
            <TabsContent value="applications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Farmer onboarding requests</CardTitle>
                  <CardDescription>Review verification submissions from farmers awaiting approval.</CardDescription>
                </CardHeader>
                <CardContent>
                  {applicationsLoading ? (
                    <div className="text-center py-10 text-muted-foreground">Loading applications...</div>
                  ) : applications.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      No pending applications at the moment.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Farm name</TableHead>
                          <TableHead>Registration</TableHead>
                          <TableHead>Govt. ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applications.map((application) => (
                          <TableRow key={application.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{application.farmName}</span>
                                {application.additionalNotes && (
                                  <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {application.additionalNotes}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{application.registrationNumber || "—"}</TableCell>
                            <TableCell>{application.governmentId || "—"}</TableCell>
                            <TableCell>
                              {application.status === "approved" ? (
                                <Badge variant="default">Approved</Badge>
                              ) : application.status === "pending" ? (
                                <Badge variant="secondary">Pending</Badge>
                              ) : (
                                <Badge variant="destructive">Needs review</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {application.submittedAt
                                ? formatDistanceToNow(application.submittedAt, { addSuffix: true })
                                : "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {application.farmerEmail ? (
                                <a
                                  href={`mailto:${application.farmerEmail}`}
                                  className="text-primary hover:underline"
                                >
                                  {application.farmerEmail}
                                </a>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  disabled={processingApplicationId === application.id}
                                  onClick={() => handleApplicationStatusChange(application.id, "approved")}
                                >
                                  <Check className="mr-1 h-4 w-4" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={processingApplicationId === application.id}
                                  onClick={() => handleApplicationStatusChange(application.id, "rejected")}
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Request Update
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;

