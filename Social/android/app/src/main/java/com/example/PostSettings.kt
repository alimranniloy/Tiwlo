package com.example

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Science
import androidx.compose.material.icons.outlined.AddCircleOutline
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.social.SocialGroup
import com.example.social.SocialRepository
import com.example.ui.theme.TiwiBlue
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

data class PostSettingsDraft(
    val visibility: String = "public",
    val commentPermission: String = "everyone",
    val scheduleAtMillis: Long? = null,
    val shareToStory: Boolean = false,
    val groupId: String? = null,
    val groupName: String? = null,
    val monetization: Boolean = false,
    val abTest: Boolean = false,
    val abVariant: String = "",
    val aiGenerated: Boolean = false
)

@Composable
fun TiwiPostSettingsPage(
    repository: SocialRepository,
    draft: PostSettingsDraft,
    onBack: () -> Unit,
    onChange: (PostSettingsDraft) -> Unit,
    onInviteCollaborator: () -> Unit,
    onShare: () -> Unit
) {
    var route by remember { mutableStateOf<String?>(null) }
    BackHandler(enabled = route != null) { route = null }
    when (route) {
        "audience" -> PostSettingsChoicePage(
            title = "Post audience", selected = draft.visibility, onBack = { route = null },
            options = listOf(
                PostSettingsOption("public", Icons.Default.Public, "Public", "Anyone on or off Tiwi"),
                PostSettingsOption("followers", Icons.Default.Groups, "Followers", "People who follow you"),
                PostSettingsOption("private", Icons.Default.Lock, "Only me", "Only you can see this post")
            ),
            onSelect = { onChange(draft.copy(visibility = it)); route = null }
        )
        "comments" -> PostSettingsChoicePage(
            title = "Who can comment", selected = draft.commentPermission, onBack = { route = null },
            options = listOf(
                PostSettingsOption("everyone", Icons.Default.ChatBubbleOutline, "Public", "Anyone who can see the post"),
                PostSettingsOption("followers", Icons.Default.Groups, "Followers", "Only people who follow you"),
                PostSettingsOption("none", Icons.Default.Lock, "No one", "Turn comments off for this post")
            ),
            onSelect = { onChange(draft.copy(commentPermission = it)); route = null }
        )
        "schedule" -> PostSchedulePage(draft.scheduleAtMillis, onBack = { route = null }) {
            onChange(draft.copy(scheduleAtMillis = it)); route = null
        }
        "story" -> PostStorySharePage(draft.shareToStory, onBack = { route = null }) {
            onChange(draft.copy(shareToStory = it)); route = null
        }
        "groups" -> PostGroupsPage(repository, draft.groupId, onBack = { route = null }) { group ->
            onChange(draft.copy(groupId = group?.id, groupName = group?.name)); route = null
        }
        "monetization" -> PostMonetizationPage(draft.monetization, onBack = { route = null }) {
            onChange(draft.copy(monetization = it)); route = null
        }
        "ab" -> PostAbTestPage(draft.abTest, draft.abVariant, onBack = { route = null }) { enabled, variant ->
            onChange(draft.copy(abTest = enabled, abVariant = variant)); route = null
        }
        else -> Unit
    }
    if (route != null) return

    Column(Modifier.fillMaxSize().background(Color.White)) {
        PostSettingsHeader("Post settings", onBack, "Share", onShare)
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 20.dp)) {
            item { PostSettingsRow(Icons.Default.Public, "Post audience", audienceLabel(draft.visibility)) { route = "audience" } }
            item { PostSettingsRow(Icons.Default.ChatBubbleOutline, "Who can comment", commentLabel(draft.commentPermission)) { route = "comments" } }
            item { PostSettingsRow(Icons.Default.Schedule, "Scheduling options", scheduleLabel(draft.scheduleAtMillis)) { route = "schedule" } }
            item { PostSettingsRow(Icons.Outlined.AddCircleOutline, "Share to Story", if (draft.shareToStory) "On · your post will also appear in your story" else "Off") { route = "story" } }
            item { PostSettingsRow(Icons.Default.Groups, "Share to Tiwi Groups", draft.groupName ?: "Off") { route = "groups" } }
            item { PostSettingsRow(Icons.Default.MonetizationOn, "Monetization", if (draft.monetization) "Enabled for this post" else "Earn from eligible content") { route = "monetization" } }
            item { PostSettingsRow(Icons.Default.PersonAdd, "Invite collaborator", "Share post credit with a collaborator") { onInviteCollaborator() } }
            item { PostSettingsRow(Icons.Default.Science, "A/B tests", if (draft.abTest) "Alternate caption is set" else "Compare an alternate caption") { route = "ab" } }
            item {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 15.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(Modifier.size(38.dp).background(Color(0xFFEFF4FF), CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.AutoAwesome, null, tint = TiwiBlue, modifier = Modifier.size(20.dp))
                    }
                    Column(Modifier.weight(1f).padding(start = 12.dp)) {
                        Text("Add AI label", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Label realistic content made with AI", color = Color(0xFF667085), fontSize = 11.sp)
                    }
                    Switch(checked = draft.aiGenerated, onCheckedChange = { onChange(draft.copy(aiGenerated = it)) })
                }
            }
        }
    }
}

private data class PostSettingsOption(val id: String, val icon: ImageVector, val title: String, val description: String)

@Composable
private fun PostSettingsHeader(title: String, onBack: () -> Unit, action: String? = null, onAction: () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().statusBarsPadding().height(56.dp).padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", modifier = Modifier.size(24.dp)) }
        Text(title, Modifier.weight(1f), fontSize = 19.sp, fontWeight = FontWeight.ExtraBold)
        if (action == null) Spacer(Modifier.width(44.dp)) else Button(
            onClick = onAction, modifier = Modifier.height(36.dp), contentPadding = PaddingValues(horizontal = 15.dp),
            shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = TiwiBlue)
        ) { Text(action, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
    }
    HorizontalDivider(thickness = .6.dp, color = Color(0xFFE6E8EC))
}

@Composable
private fun PostSettingsRow(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 15.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, modifier = Modifier.size(25.dp), tint = Color.Black)
        Column(Modifier.weight(1f).padding(start = 15.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            Text(subtitle, color = Color(0xFF667085), fontSize = 11.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
        Icon(Icons.Default.ChevronRight, null, tint = Color(0xFF667085), modifier = Modifier.size(24.dp))
    }
}

@Composable
private fun PostSettingsChoicePage(title: String, selected: String, options: List<PostSettingsOption>, onBack: () -> Unit, onSelect: (String) -> Unit) {
    Column(Modifier.fillMaxSize().background(Color.White)) {
        PostSettingsHeader(title, onBack)
        LazyColumn(Modifier.fillMaxSize()) {
            items(options, key = { it.id }) { option ->
                Row(Modifier.fillMaxWidth().clickable { onSelect(option.id) }.padding(horizontal = 15.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(39.dp).background(Color(0xFFF0F2F5), CircleShape), contentAlignment = Alignment.Center) { Icon(option.icon, null, modifier = Modifier.size(20.dp)) }
                    Column(Modifier.weight(1f).padding(start = 12.dp)) {
                        Text(option.title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text(option.description, color = Color(0xFF667085), fontSize = 11.sp)
                    }
                    RadioButton(selected = selected == option.id, onClick = { onSelect(option.id) })
                }
            }
        }
    }
}

@Composable
private fun PostSchedulePage(selected: Long?, onBack: () -> Unit, onSave: (Long?) -> Unit) {
    val now = remember { System.currentTimeMillis() }
    val calendar = remember { Calendar.getInstance() }
    fun at(hour: Int, dayOffset: Int): Long = Calendar.getInstance().apply {
        add(Calendar.DAY_OF_YEAR, dayOffset); set(Calendar.HOUR_OF_DAY, hour); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }.timeInMillis
    val tonight = remember { at(20, if (calendar.get(Calendar.HOUR_OF_DAY) < 20) 0 else 1) }
    val tomorrow = remember { at(9, 1) }
    val options = listOf(
        null to "Publish now",
        now + 60 * 60 * 1000L to "In 1 hour",
        tonight to "Tonight at 8:00 PM",
        tomorrow to "Tomorrow at 9:00 AM"
    )
    Column(Modifier.fillMaxSize().background(Color.White)) {
        PostSettingsHeader("Scheduling options", onBack)
        Text("Choose when Tiwi should publish this post. Scheduled posts wait safely in the background until the chosen time.", color = Color(0xFF667085), fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(15.dp))
        options.forEach { (time, label) ->
            Row(Modifier.fillMaxWidth().clickable { onSave(time) }.padding(horizontal = 15.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Schedule, null, modifier = Modifier.size(22.dp), tint = TiwiBlue)
                Column(Modifier.weight(1f).padding(start = 13.dp)) {
                    Text(label, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    if (time != null) Text(formatSchedule(time), color = Color(0xFF667085), fontSize = 11.sp)
                }
                RadioButton(selected = selected == time, onClick = { onSave(time) })
            }
        }
    }
}

@Composable
private fun PostStorySharePage(enabled: Boolean, onBack: () -> Unit, onSave: (Boolean) -> Unit) {
    Column(Modifier.fillMaxSize().background(Color.White)) {
        PostSettingsHeader("Share to Story", onBack)
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(43.dp).background(Color(0xFFEAF2FF), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Default.Share, null, tint = TiwiBlue) }
            Column(Modifier.weight(1f).padding(start = 13.dp)) {
                Text("Also share this post to your story", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text("Your story uses the selected audience and expires after 24 hours.", color = Color(0xFF667085), fontSize = 11.sp, lineHeight = 15.sp)
            }
            Switch(checked = enabled, onCheckedChange = onSave)
        }
    }
}

@Composable
private fun PostGroupsPage(repository: SocialRepository, selectedId: String?, onBack: () -> Unit, onSave: (SocialGroup?) -> Unit) {
    var groups by remember { mutableStateOf<List<SocialGroup>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        groups = runCatching { repository.groups(mine = true) }.getOrDefault(emptyList()).filter { it.viewerJoined }
        loading = false
    }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        PostSettingsHeader("Share to Tiwi Groups", onBack)
        if (loading) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(26.dp), strokeWidth = 2.dp) }
        else LazyColumn(Modifier.fillMaxSize()) {
            item {
                Row(Modifier.fillMaxWidth().clickable { onSave(null) }.padding(horizontal = 15.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(39.dp).background(Color(0xFFF0F2F5), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Default.Close, null) }
                    Column(Modifier.weight(1f).padding(start = 12.dp)) { Text("Off", fontWeight = FontWeight.Bold, fontSize = 14.sp); Text("Publish only to your profile/feed", color = Color(0xFF667085), fontSize = 11.sp) }
                    RadioButton(selected = selectedId == null, onClick = { onSave(null) })
                }
            }
            if (groups.isEmpty()) item { Text("Join a group before sharing a post to it.", color = Color(0xFF667085), fontSize = 12.sp, modifier = Modifier.padding(16.dp)) }
            items(groups, key = { it.id }) { group ->
                Row(Modifier.fillMaxWidth().clickable { onSave(group) }.padding(horizontal = 15.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(39.dp).background(Color(0xFFEAF2FF), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Default.Groups, null, tint = TiwiBlue) }
                    Column(Modifier.weight(1f).padding(start = 12.dp)) { Text(group.name, fontWeight = FontWeight.Bold, fontSize = 14.sp); Text("${group.memberCount} members", color = Color(0xFF667085), fontSize = 11.sp) }
                    RadioButton(selected = selectedId == group.id, onClick = { onSave(group) })
                }
            }
        }
    }
}

@Composable
private fun PostMonetizationPage(enabled: Boolean, onBack: () -> Unit, onSave: (Boolean) -> Unit) {
    Column(Modifier.fillMaxSize().background(Color.White)) {
        PostSettingsHeader("Monetization", onBack)
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(11.dp)) {
            Text("Content monetization", fontWeight = FontWeight.ExtraBold, fontSize = 19.sp)
            Text("Mark this post as eligible for Tiwi monetization review. Eligibility, payouts and policy checks remain controlled by your Creator Dashboard.", color = Color(0xFF667085), fontSize = 12.sp, lineHeight = 17.sp)
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("Request monetization review", Modifier.weight(1f), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Switch(checked = enabled, onCheckedChange = onSave)
            }
        }
    }
}

@Composable
private fun PostAbTestPage(enabled: Boolean, variant: String, onBack: () -> Unit, onSave: (Boolean, String) -> Unit) {
    var active by remember(enabled) { mutableStateOf(enabled) }
    var caption by remember(variant) { mutableStateOf(variant) }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        PostSettingsHeader("A/B tests", onBack, "Save") { onSave(active, caption.trim().take(10_000)) }
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Test an alternate caption", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
            Text("Tiwi stores the alternate caption with this post for creator analytics and future distribution tests.", color = Color(0xFF667085), fontSize = 12.sp, lineHeight = 17.sp)
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { Text("Enable A/B test", Modifier.weight(1f), fontWeight = FontWeight.Bold); Switch(checked = active, onCheckedChange = { active = it }) }
            OutlinedTextField(caption, { caption = it }, enabled = active, modifier = Modifier.fillMaxWidth(), minLines = 4, label = { Text("Alternate caption") }, supportingText = { Text("Saved with this post for analytics") })
        }
    }
}

private fun audienceLabel(value: String) = when (value) { "followers" -> "Followers"; "private" -> "Only me"; else -> "Public" }
private fun commentLabel(value: String) = when (value) { "followers" -> "Followers"; "none" -> "No one"; else -> "Public" }
private fun scheduleLabel(value: Long?) = value?.let(::formatSchedule) ?: "Publish now"
private fun formatSchedule(value: Long): String = SimpleDateFormat("EEE, MMM d · h:mm a", Locale.getDefault()).format(Date(value))
