"""Servidor MCP local para consultar el inventario en modo de solo lectura."""

import os
from pathlib import Path
from typing import TypedDict

import psycopg
from dotenv import load_dotenv
from fastmcp import FastMCP
from fastmcp.exceptions import ToolError
from psycopg.rows import dict_row


load_dotenv(dotenv_path=Path(__file__).resolve().with_name(".env"), override=True)

mcp = FastMCP("Mini Inventario", mask_error_details=True)


class Producto(TypedDict):
    nombre: str
    sku: str
    cantidad: int
    minimo: int


def _consultar(consulta: str, parametros: tuple) -> list[Producto]:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ToolError("Falta configurar DATABASE_URL en mcp-inventario/.env.")

    try:
        with psycopg.connect(
            database_url,
            options="-c default_transaction_read_only=on -c statement_timeout=10000",
            connect_timeout=10,
            row_factory=dict_row,
        ) as conexion:
            # Algunos poolers no aplican las opciones de inicio de sesión.
            conexion.read_only = True
            with conexion.cursor() as cursor:
                cursor.execute("SET LOCAL default_transaction_read_only = on")
                cursor.execute("SET LOCAL statement_timeout = '10s'")
                cursor.execute(consulta, parametros)
                return cursor.fetchall()
    except (psycopg.Error, ValueError):
        # Los errores del controlador pueden incluir detalles de conexión.
        raise ToolError("No se pudo consultar el inventario.") from None


@mcp.tool(annotations={"readOnlyHint": True, "destructiveHint": False})
def buscar_producto(nombre: str) -> list[Producto]:
    """Busca por parte del nombre sin distinguir mayúsculas; devuelve hasta 50 productos.

    Los caracteres % y _ conservan su significado de comodines de ILIKE.
    """
    return _consultar(
        """
        SELECT nombre, sku, cantidad, minimo
        FROM public.productos
        WHERE nombre ILIKE %s
        ORDER BY nombre, sku
        LIMIT %s
        """,
        (f"%{nombre}%", 50),
    )


@mcp.tool(annotations={"readOnlyHint": True, "destructiveHint": False})
def stock_bajo() -> list[Producto]:
    """Devuelve hasta 50 productos cuya cantidad es menor que su mínimo."""
    return _consultar(
        """
        SELECT nombre, sku, cantidad, minimo
        FROM public.productos
        WHERE cantidad < minimo
        ORDER BY nombre, sku
        LIMIT %s
        """,
        (50,),
    )


if __name__ == "__main__":
    mcp.run(transport="stdio", show_banner=False)
