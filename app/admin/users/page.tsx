"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Mail, Phone, MapPin, Package, Calendar } from "lucide-react";

type Customer = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone?: string;
  address?: string;
  createdAt: number;
  subscription?: {
    plan: "Basic" | "Premium";
    status: "active" | "cancelled" | "pending";
    nextBilling?: string;
  };
  installDate?: string;
};

// Mock data for demo
const mockCustomers: Customer[] = [
  {
    id: "demo_user_1",
    email: "john.smith@example.com",
    firstName: "John",
    lastName: "Smith",
    phone: "(765) 555-0123",
    address: "123 Oak St, Muncie, IN 47302",
    createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
    subscription: {
      plan: "Premium",
      status: "active",
      nextBilling: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    },
    installDate: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  },
  {
    id: "demo_user_2",
    email: "sarah.johnson@example.com",
    firstName: "Sarah",
    lastName: "Johnson",
    phone: "(765) 555-0456",
    address: "456 Maple Ave, Anderson, IN 46016",
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    subscription: {
      plan: "Basic",
      status: "active",
      nextBilling: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    },
    installDate: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  },
  {
    id: "demo_user_3",
    email: "michael.brown@example.com",
    firstName: "Michael",
    lastName: "Brown",
    phone: "(765) 555-0789",
    address: "789 Pine Rd, Richmond, IN 47374",
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    subscription: {
      plan: "Premium",
      status: "active",
      nextBilling: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    },
    installDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  },
  {
    id: "demo_user_4",
    email: "emily.davis@example.com",
    firstName: "Emily",
    lastName: "Davis",
    phone: "(765) 555-0321",
    address: "321 Elm St, Muncie, IN 47303",
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    subscription: {
      plan: "Basic",
      status: "pending",
    },
  },
  {
    id: "demo_user_5",
    email: "robert.wilson@example.com",
    firstName: "Robert",
    lastName: "Wilson",
    phone: "(765) 555-0654",
    address: "654 Birch Ln, Anderson, IN 46013",
    createdAt: Date.now() - 120 * 24 * 60 * 60 * 1000,
    subscription: {
      plan: "Premium",
      status: "cancelled",
    },
    installDate: new Date(Date.now() - 115 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  },
];

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "pending" | "cancelled">("all");

  const customers = mockCustomers;

  // Filter customers based on search and status
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery);
    
    const matchesStatus = 
      filterStatus === "all" || customer.subscription?.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.subscription?.status === "active").length;
  const pendingCustomers = customers.filter(c => c.subscription?.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer accounts and subscriptions
          </p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Installs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCustomers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                All
              </Button>
              <Button
                variant={filterStatus === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("active")}
              >
                Active
              </Button>
              <Button
                variant={filterStatus === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("pending")}
              >
                Pending
              </Button>
              <Button
                variant={filterStatus === "cancelled" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("cancelled")}
              >
                Cancelled
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Install Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8 pl-6 pr-6">
                    No customers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-muted/50">
                    <TableCell className="pl-6">
                      <div className="font-medium">
                        {customer.firstName} {customer.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {customer.address || "No address"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {customer.email}
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.subscription ? (
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{customer.subscription.plan}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No subscription</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.installDate ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {customer.installDate}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not scheduled</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          customer.subscription?.status === "active"
                            ? "default"
                            : customer.subscription?.status === "pending"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {customer.subscription?.status || "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/users/${customer.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
