package com.bmwe60.coderpro.plugin

import com.bmwe60.coderpro.data.*
import com.bmwe60.coderpro.network.*
import com.bmwe60.coderpro.protocol.*
import com.bmwe60.coderpro.usb.*
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject

@CapacitorPlugin(name = "OBD2Bridge")
class OBD2BridgePlugin : Plugin() {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var transport: Transport? = null
    private var session: KdcanSession? = null

    @PluginMethod
    fun connect(call: PluginCall) {
        val transportType = call.getString("transport") ?: "USB_KDCAN"
        val baudRate = call.getInt("baudRate") ?: 115200
        val host = call.getString("host") ?: "192.168.0.10"
        val port = call.getInt("port") ?: 35000

        scope.launch {
            try {
                transport = when (transportType.uppercase()) {
                    "ETHERNET_OBD" -> TcpObdTransport(host, port)
                    "SIM_REMOTE" -> SimRemoteTransport(host, port)
                    else -> UsbSerialTransport(activity.application, baudRate)
                }

                transport?.connect(null)
                transport?.let {
                    session = KdcanSession(it)
                    session?.onConnected()
                }

                call.resolve(JSObject().put("connected", true))
            } catch (e: Exception) {
                call.reject("Connection failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        scope.launch {
            try {
                session = null
                transport?.disconnect()
                transport = null
                call.resolve()
            } catch (e: Exception) {
                call.reject(e.message)
            }
        }
    }

    @PluginMethod
    fun listDevices(call: PluginCall) {
        scope.launch {
            try {
                val t = transport ?: UsbSerialTransport(activity.application)
                val devices = t.listDevices()
                val arr = JSONArray()
                devices.forEach {
                    val o = JSONObject()
                    o.put("id", it.id)
                    o.put("name", it.name)
                    arr.put(o)
                }
                call.resolve(JSObject().put("devices", arr))
            } catch (e: Exception) {
                call.reject(e.message)
            }
        }
    }

    @PluginMethod
    fun executeJob(call: PluginCall) {
        val jobId = call.getString("jobId") ?: return call.reject("jobId required")
        val targetName = call.getString("target") ?: "DME / DDE"
        val target = BmwTargets.defaults.find { it.name == targetName } ?: BmwTargets.DME

        scope.launch {
            try {
                val s = session ?: return@launch call.reject("Not connected")
                s.setTarget(target)
                val job = BmwJobs.byId(jobId) ?: return@launch call.reject("Unknown job")
                val result = s.execute(job)

                val obj = JSObject()
                obj.put("success", result.success)
                obj.put("summary", result.summary)
                obj.put("requestHex", result.requestHex)
                obj.put("responseHex", result.responseHex)

                val decoded = JSONObject()
                result.decoded.forEach { (k, v) -> decoded.put(k, v) }
                obj.put("decoded", decoded)

                call.resolve(obj)
            } catch (e: Exception) {
                call.reject("Job failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun setTarget(call: PluginCall) {
        val targetName = call.getString("target") ?: return call.reject("target required")
        val target = BmwTargets.defaults.find { it.name == targetName }
            ?: return call.reject("Unknown target")
        session?.setTarget(target)
        call.resolve()
    }

    @PluginMethod
    fun sendRawHex(call: PluginCall) {
        val hex = call.getString("hex") ?: return call.reject("hex required")
        scope.launch {
            try {
                val response = session?.sendRawHex(hex) ?: ""
                call.resolve(JSObject().put("response", response))
            } catch (e: Exception) {
                call.reject(e.message)
            }
        }
    }

    companion object {
        private var pendingPermissionCallback: UsbSerialManager.PermissionCallback? = null

        @JvmStatic
        fun setPendingPermissionCallback(device: Any, callback: UsbSerialManager.PermissionCallback) {
            pendingPermissionCallback = callback
        }

        @JvmStatic
        fun getPendingPermissionCallback(): UsbSerialManager.PermissionCallback? = pendingPermissionCallback

        @JvmStatic
        fun clearPendingPermissionCallback() {
            pendingPermissionCallback = null
        }
    }
}
