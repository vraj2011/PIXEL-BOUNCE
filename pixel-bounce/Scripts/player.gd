extends CharacterBody2D

@onready var sprite = $Sprite2D
@onready var level = get_parent()
@onready var respawn_point = level.get_node("RespawnPoint")
@onready var score_ui = level.get_node_or_null("ScoreUI")
@onready var game_over_ui = level.get_node("GameOverUI")
@onready var final_score_label = game_over_ui.get_node("FinalScoreLabel")
@onready var respawn_button = game_over_ui.get_node("RespawnButton")

# Audio players
@onready var jump_sound = $JumpSound
@onready var landing_sound = $LandingSound
@onready var trampoline_sound = $TrampolineSound
@onready var rolling_sound = $RollingSound
@onready var spike_sound = $SpikeSound
@onready var game_over_sound = $GameOverSound
@onready var respawn_sound = $RespawnSound

# Textures
var calm = preload("res://Assets/ball_calm.png")
var ball_up = preload("res://Assets/ball_up.png")
var squash = preload("res://Assets/ball_squash.png")

# Settings
const SPEED = 440
const JUMP_VELOCITY = -400
const BOUNCE_VELOCITY = -800
const RESPAWN_Y = 1500

const ROLL_SPEED = 7.0
const FLIP_SPEED = 12.0

var is_dead = false
var jump_locked = false
var is_flipping = false
var visited_islands = []
var was_on_floor = false


func _ready():
	if score_ui == null:
		push_error("ScoreUI node not found!")
		return

	game_over_ui.visible = false
	respawn_button.pressed.connect(respawn)


func _physics_process(_delta):
	if is_dead:
		return

	was_on_floor = is_on_floor()

	# Movement
	var direction = Input.get_axis("ui_left", "ui_right")

	if Input.is_key_pressed(KEY_A):
		direction = -1
	elif Input.is_key_pressed(KEY_D):
		direction = 1

	velocity.x = direction * SPEED

	# Gravity
	if not is_on_floor():
		velocity += get_gravity() * _delta

	# Jump reset
	if Input.is_action_just_released("ui_accept"):
		jump_locked = false

	# Jump
	if Input.is_action_just_pressed("ui_accept") and is_on_floor() and not jump_locked:
		velocity.y = JUMP_VELOCITY
		jump_locked = true
		is_flipping = true
		jump_sound.play()

	# Flip while jumping
	if is_flipping:
		sprite.rotation += FLIP_SPEED * _delta

		if sprite.rotation >= TAU:
			sprite.rotation = 0
			is_flipping = false

	# Roll while running
	elif is_on_floor() and direction != 0:
		sprite.rotation += direction * ROLL_SPEED * _delta

	# Rolling sound
	if is_on_floor() and direction != 0:
		if not rolling_sound.playing:
			rolling_sound.play()
	else:
		rolling_sound.stop()

	move_and_slide()

	# Landing sound
	if not was_on_floor and is_on_floor():
		landing_sound.play()

	# Void respawn
	if global_position.y > RESPAWN_Y:
		global_position = respawn_point.global_position
		velocity = Vector2.ZERO
		jump_locked = false
		is_flipping = false
		sprite.rotation = 0
		sprite.texture = calm
		return

	# Collision detection
	for i in get_slide_collision_count():
		var collision = get_slide_collision(i)
		var collider = collision.get_collider()

		# Spikes
		if collider.is_in_group("spikes"):
			die()
			return

		# Bouncy platforms
		if collider.is_in_group("bounce_platform"):
			if collision.get_normal().y < -0.5:
				var island_id = collider.get_instance_id()

				if not visited_islands.has(island_id):
					visited_islands.append(island_id)
					score_ui.add_point()

				velocity.y = BOUNCE_VELOCITY
				jump_locked = true
				is_flipping = true
				trampoline_sound.play()

		# Horizontal trampolines
		if collider.is_in_group("side_trampoline"):
			var push_direction = sign(global_position.x - collider.global_position.x)

			if push_direction == 0:
				push_direction = 1

			velocity.x = push_direction * 1000
			velocity.y = -250

			is_flipping = true
			jump_locked = true
			trampoline_sound.play()

	# Ball appearance
	if is_on_floor():
		sprite.texture = calm
	else:
		sprite.texture = ball_up


func die():
	if is_dead:
		return

	is_dead = true
	velocity = Vector2.ZERO

	rolling_sound.stop()
	spike_sound.play()
	game_over_sound.play()

	is_flipping = false
	sprite.rotation = 0
	sprite.texture = squash

	final_score_label.text = "Final Score: " + str(score_ui.score)
	game_over_ui.visible = true


func respawn():
	global_position = respawn_point.global_position
	velocity = Vector2.ZERO

	is_dead = false
	jump_locked = false
	is_flipping = false

	sprite.rotation = 0
	sprite.texture = calm

	visited_islands.clear()

	score_ui.score = 0
	score_ui.get_node("ScoreLabel").text = "Score: 0"

	game_over_ui.visible = false

	respawn_sound.play()
