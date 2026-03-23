import { Router } from "express";
import { prisma } from "../prisma";
import { checkModuleAccess } from "../middleware/modules";
import { deleteOwnedRecord, findOwnedRecord, getCompanyId, updateOwnedRecord } from "../lib/domain";
import { requireCompanyContext } from "../middleware/company";
import { asNumber, asOptionalDate } from "../lib/validation";

const inventoryRouter = Router();

inventoryRouter.use(requireCompanyContext);

inventoryRouter.get("/products", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const products = await prisma.product.findMany({
            where: { companyId },
            include: { stocks: { include: { warehouse: true } } },
            orderBy: { name: "asc" }
        });
        res.json(products);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch products", details: err.message });
    }
});

inventoryRouter.post("/products", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { code, name, description, type, category, unit, price } = req.body;
        const product = await prisma.product.create({
            data: {
                companyId,
                code,
                name,
                description,
                type: type || "GOOD",
                category,
                unit: unit || "UN",
                price: asNumber(price)
            }
        });
        res.json(product);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to create product", details: err.message });
    }
});

inventoryRouter.put("/products/:id", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const { code, name, description, type, category, unit, price } = req.body;

        const product = await updateOwnedRecord(prisma.product, id, companyId, {
            code,
            name,
            description,
            type,
            category,
            unit,
            price: asNumber(price)
        });
        if (!product) return res.status(404).json({ error: "Product not found" });
        res.json(product);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to update product", details: err.message });
    }
});

inventoryRouter.delete("/products/:id", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const deleted = await deleteOwnedRecord(prisma.product, id, companyId);
        if (!deleted) return res.status(404).json({ error: "Product not found" });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: "Failed to delete product", details: err.message });
    }
});

inventoryRouter.get("/warehouses", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const warehouses = await prisma.warehouse.findMany({
            where: { companyId },
            include: { stocks: { include: { product: true } } },
            orderBy: { name: "asc" }
        });
        res.json(warehouses);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch warehouses", details: err.message });
    }
});

inventoryRouter.post("/warehouses", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { name, location, manager } = req.body;
        const warehouse = await prisma.warehouse.create({
            data: { companyId, name, location, manager }
        });
        res.json(warehouse);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to create warehouse", details: err.message });
    }
});

inventoryRouter.put("/warehouses/:id", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const { name, location, manager } = req.body;

        const warehouse = await updateOwnedRecord(prisma.warehouse, id, companyId, {
            name,
            location,
            manager
        });
        if (!warehouse) return res.status(404).json({ error: "Warehouse not found" });
        res.json(warehouse);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to update warehouse", details: err.message });
    }
});

inventoryRouter.delete("/warehouses/:id", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { id } = req.params;
        const deleted = await deleteOwnedRecord(prisma.warehouse, id, companyId);
        if (!deleted) return res.status(404).json({ error: "Warehouse not found" });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: "Failed to delete warehouse", details: err.message });
    }
});

inventoryRouter.get("/inventory-movements", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { productId, warehouseId, type, startDate, endDate } = req.query;

        const where: any = { companyId };

        if (productId) where.productId = productId as string;
        if (type) where.type = type as string;
        if (warehouseId) {
            where.OR = [
                { fromWarehouseId: warehouseId as string },
                { toWarehouseId: warehouseId as string }
            ];
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate as string);
            if (endDate) where.date.lte = new Date(endDate as string);
        }

        const movements = await prisma.inventoryMovement.findMany({
            where,
            include: {
                product: { select: { id: true, name: true, code: true } },
                fromWarehouse: { select: { id: true, name: true } },
                toWarehouse: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } }
            },
            orderBy: { date: "desc" },
            take: 200
        });

        res.json(movements);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to fetch movements", details: err.message });
    }
});

inventoryRouter.post("/inventory-movements", checkModuleAccess("INVENTORY"), async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ error: "Company ID required" });

        const { type, quantity, date, description, productId, fromWarehouseId, toWarehouseId, projectId } = req.body;

        const [product, fromWarehouse, toWarehouse, project] = await Promise.all([
            productId ? findOwnedRecord(prisma.product, productId, companyId) : Promise.resolve(null),
            fromWarehouseId ? findOwnedRecord(prisma.warehouse, fromWarehouseId, companyId) : Promise.resolve(null),
            toWarehouseId ? findOwnedRecord(prisma.warehouse, toWarehouseId, companyId) : Promise.resolve(null),
            projectId ? findOwnedRecord(prisma.project, projectId, companyId) : Promise.resolve(null)
        ]);

        if (!product) return res.status(404).json({ error: "Product not found" });
        if (fromWarehouseId && !fromWarehouse) return res.status(404).json({ error: "Source warehouse not found" });
        if (toWarehouseId && !toWarehouse) return res.status(404).json({ error: "Destination warehouse not found" });
        if (projectId && !project) return res.status(404).json({ error: "Project not found" });

        const result = await prisma.$transaction(async (tx) => {
            const movement = await tx.inventoryMovement.create({
                data: {
                    companyId,
                    type,
                    quantity: asNumber(quantity),
                    date: asOptionalDate(date) || new Date(),
                    description,
                    productId,
                    fromWarehouseId,
                    toWarehouseId,
                    projectId
                }
            });

            const updateStock = async (warehouseId: string, qtyChange: number) => {
                const currentStock = await tx.stock.findUnique({
                    where: { productId_warehouseId: { productId, warehouseId } }
                });

                if (currentStock) {
                    await tx.stock.update({
                        where: { productId_warehouseId: { productId, warehouseId } },
                        data: {
                            quantity: {
                                increment: qtyChange
                            }
                        }
                    });
                } else {
                    await tx.stock.create({
                        data: {
                            productId,
                            warehouseId,
                            quantity: qtyChange
                        }
                    });
                }
            };

            const qty = asNumber(quantity);
            if (type === "IN" && toWarehouseId) {
                await updateStock(toWarehouseId, qty);
            } else if (type === "OUT" && fromWarehouseId) {
                await updateStock(fromWarehouseId, -qty);
            } else if (type === "TRANSFER" && fromWarehouseId && toWarehouseId) {
                await updateStock(fromWarehouseId, -qty);
                await updateStock(toWarehouseId, qty);
            } else if (type === "ADJUSTMENT" && toWarehouseId) {
                await updateStock(toWarehouseId, qty);
            }

            return movement;
        });

        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: "Failed to process inventory movement", details: err.message });
    }
});

export default inventoryRouter;
